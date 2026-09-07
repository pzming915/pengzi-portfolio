/* 彭子作品集：占位图回退、淡入、复制微信、无库灯箱。 */
(function () {
  function initImageFallbacks() {
    document.querySelectorAll("img[data-placeholder]").forEach((image) => {
      if (image.width && image.height && image.parentElement) {
        image.parentElement.style.aspectRatio = `${image.width} / ${image.height}`;
      }
      image.addEventListener("error", () => {
        if (image.dataset.fallbackApplied) {
          return;
        }
        image.dataset.fallbackApplied = "true";
        image.src = image.dataset.placeholder;
      });
    });
  }

  function initReveal() {
    const reveals = document.querySelectorAll(".reveal");
    if (!("IntersectionObserver" in window)) {
      reveals.forEach((node) => node.classList.add("is-visible"));
      return;
    }

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12 });

    reveals.forEach((node) => observer.observe(node));
  }

  function initCopy() {
    document.querySelectorAll("[data-copy]").forEach((button) => {
      button.addEventListener("click", async () => {
        try {
          await navigator.clipboard.writeText(button.dataset.copy);
          button.textContent = button.dataset.copyDone;
          window.setTimeout(() => {
            button.textContent = button.dataset.copyDefault;
          }, 2000);
        } catch (error) {
          button.textContent = button.dataset.copy;
        }
      });
    });
  }

  function initSeriesCards() {
    document.querySelectorAll("[data-series-toggle]").forEach((button) => {
      button.addEventListener("click", () => {
        const card = button.closest(".series-card");
        const gallery = document.getElementById(button.getAttribute("aria-controls"));
        if (!card || !gallery) {
          return;
        }
        const willOpen = gallery.hidden;

        document.querySelectorAll(".series-card.is-expanded").forEach((openCard) => {
          if (openCard === card) {
            return;
          }
          const openButton = openCard.querySelector("[data-series-toggle]");
          const openGallery = openCard.querySelector(".series-gallery");
          openCard.classList.remove("is-expanded");
          if (openButton) {
            openButton.setAttribute("aria-expanded", "false");
          }
          if (openGallery) {
            openGallery.hidden = true;
          }
        });

        card.classList.toggle("is-expanded", willOpen);
        button.setAttribute("aria-expanded", String(willOpen));
        gallery.hidden = !willOpen;
      });
    });
  }

  function createLightbox() {
    const lightbox = document.createElement("div");
    lightbox.className = "lightbox";
    lightbox.setAttribute("role", "dialog");
    lightbox.setAttribute("aria-modal", "true");
    lightbox.setAttribute("aria-label", "Image viewer");
    lightbox.innerHTML = `
      <button class="lightbox-close" type="button" aria-label="Close image viewer">×</button>
      <div class="lightbox-image-wrap">
        <button class="lightbox-zone prev" type="button" aria-label="Previous image"></button>
        <img class="lightbox-image" src="" alt="">
        <button class="lightbox-zone next" type="button" aria-label="Next image"></button>
      </div>
      <p class="lightbox-caption"><span data-lightbox-caption></span><span data-lightbox-count></span></p>
    `;
    document.body.appendChild(lightbox);
    return lightbox;
  }

  function getGalleryData() {
    const dataNode = document.getElementById("gallery-data");
    if (!dataNode) {
      return {};
    }

    try {
      return JSON.parse(dataNode.textContent);
    } catch (error) {
      return {};
    }
  }

  function preloadNeighbours() {
    [currentIndex - 1, currentIndex + 1].forEach((index) => {
      const item = activeItems[(index + activeItems.length) % activeItems.length];
      if (!item) {
        return;
      }
      const image = new Image();
      image.src = item.src;
      image.onerror = () => {
        image.src = item.placeholder;
      };
    });
  }

  function showImage(lightbox, index) {
    currentIndex = (index + activeItems.length) % activeItems.length;
    const item = activeItems[currentIndex];
    const image = lightbox.querySelector(".lightbox-image");
    const caption = lightbox.querySelector("[data-lightbox-caption]");
    const count = lightbox.querySelector("[data-lightbox-count]");

    image.classList.add("is-fading");
    window.setTimeout(() => {
      image.src = item.src;
      image.alt = item.alt;
      image.onerror = () => {
        image.onerror = null;
        image.src = item.placeholder;
      };
      caption.textContent = item.caption;
      count.textContent = `${currentIndex + 1} / ${activeItems.length}`;
      image.classList.remove("is-fading");
      preloadNeighbours();
    }, 120);
  }

  function closeLightbox(lightbox) {
    lightbox.classList.remove("is-open");
    document.body.classList.remove("lightbox-open");
    if (previousFocus) {
      previousFocus.focus();
    }
  }

  function trapFocus(event, lightbox) {
    if (event.key !== "Tab") {
      return;
    }
    const focusables = lightbox.querySelectorAll("button");
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  function initLightbox() {
    const triggers = Array.from(document.querySelectorAll("[data-lightbox]"));
    if (!triggers.length) {
      return;
    }

    const galleryData = getGalleryData();
    triggers.forEach((trigger, index) => {
      const image = trigger.querySelector("img");
      const item = {
        src: trigger.dataset.src,
        placeholder: trigger.dataset.placeholder,
        caption: trigger.dataset.caption,
        alt: image ? image.alt : trigger.dataset.caption
      };

      imageItems.push(item);
      trigger.addEventListener("click", () => {
        const lightbox = document.querySelector(".lightbox") || createLightbox();
        const galleryKey = trigger.dataset.galleryKey;
        const galleryIndex = Number.parseInt(trigger.dataset.galleryIndex || "0", 10);
        activeItems = galleryKey && galleryData[galleryKey] ? galleryData[galleryKey] : imageItems;
        previousFocus = trigger;
        document.body.classList.add("lightbox-open");
        lightbox.classList.add("is-open");
        showImage(lightbox, galleryKey ? galleryIndex : index);
        lightbox.querySelector(".lightbox-close").focus();
      });
    });

    const lightbox = createLightbox();
    lightbox.querySelector(".lightbox-close").addEventListener("click", () => closeLightbox(lightbox));
    lightbox.querySelector(".lightbox-zone.prev").addEventListener("click", () => showImage(lightbox, currentIndex - 1));
    lightbox.querySelector(".lightbox-zone.next").addEventListener("click", () => showImage(lightbox, currentIndex + 1));
    lightbox.addEventListener("click", (event) => {
      if (event.target === lightbox || event.target.classList.contains("lightbox-image-wrap")) {
        closeLightbox(lightbox);
      }
    });
    lightbox.addEventListener("touchstart", (event) => {
      touchStartX = event.changedTouches[0].clientX;
    }, { passive: true });
    lightbox.addEventListener("touchend", (event) => {
      const diff = event.changedTouches[0].clientX - touchStartX;
      if (Math.abs(diff) > 42) {
        showImage(lightbox, diff > 0 ? currentIndex - 1 : currentIndex + 1);
      }
    }, { passive: true });

    document.addEventListener("keydown", (event) => {
      if (!lightbox.classList.contains("is-open")) {
        return;
      }
      if (event.key === "Escape") {
        closeLightbox(lightbox);
      } else if (event.key === "ArrowLeft") {
        showImage(lightbox, currentIndex - 1);
      } else if (event.key === "ArrowRight") {
        showImage(lightbox, currentIndex + 1);
      } else {
        trapFocus(event, lightbox);
      }
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    initImageFallbacks();
    initReveal();
    initCopy();
    initSeriesCards();
    initLightbox();
  });
})();
