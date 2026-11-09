/*!
 * Aurelia Dining — components/gallery.js
 * Gallery grid renderer + accessible lightbox (native <dialog>).
 *
 *  - In the browser, thumbnails are <button>s that open the lightbox.
 *    The baked static fallback (no JS) uses plain <figure>s, so there are
 *    never buttons that do nothing.
 *  - Lightbox: modal <dialog> (background inert, focus contained), Escape and
 *    the close button close it, ←/→ and swipe navigate, focus returns to the
 *    thumbnail that opened it.
 */
(function (A) {
  "use strict";

  var utils = A.utils;
  var T = function (v, c) { return utils.text(v, c); };
  var FULL_WIDTHS = [800, 1200, 1600, 2000];
  var SWIPE_PX = 50;

  function items(content) {
    var list = utils.get(content, "gallery.items");
    return Array.isArray(list) ? list.filter(function (i) { return i && i.src; }) : [];
  }

  A.render.register("gallery", function (content, opts, ctx) {
    var list = items(content);
    if (!list.length) return null;
    // Buttons only where the lightbox can actually open; otherwise plain figures.
    var runtime = !!(ctx && ctx.runtime) && typeof window !== "undefined" && typeof window.HTMLDialogElement === "function";
    return list.map(function (item, i) {
      var mod = item.wide ? " gallery__item--wide" : item.tall ? " gallery__item--tall" : "";
      var caption = item.caption || item.alt || "";
      var img = utils.imgTag(item, {
        widths: [360, 560, 800, 1100],
        sizes: item.wide
          ? "(min-width: 60em) 46rem, (min-width: 40em) calc(100vw - 4rem), calc(100vw - 2rem)"
          : "(min-width: 60em) 23rem, (min-width: 40em) calc(50vw - 2.5rem), calc(100vw - 2rem)",
        width: 800,
        height: 600,
        alt: runtime ? "" : item.alt || ""
      });
      if (runtime) {
        return (
          '<li class="gallery__item' + mod + '">' +
            '<button type="button" class="gallery__thumb" data-gallery-index="' + i + '" aria-haspopup="dialog" aria-label="View photo ' + (i + 1) + " of " + list.length + ": " + T(caption, content) + '">' +
              img +
              '<span class="gallery__caption" aria-hidden="true">' + T(caption, content) + "</span>" +
            "</button>" +
          "</li>"
        );
      }
      return (
        '<li class="gallery__item' + mod + '">' +
          '<figure class="gallery__thumb gallery__thumb--static">' + img +
            '<figcaption class="gallery__caption">' + T(caption, content) + "</figcaption>" +
          "</figure>" +
        "</li>"
      );
    }).join("");
  });

  /* ------------------------------------------------------------------ lightbox */
  function init(content) {
    var root = utils.qs("[data-gallery]");
    var dialog = utils.qs("[data-lightbox]");
    var list = items(content);
    if (!root || !dialog || !list.length) return;
    if (typeof dialog.showModal !== "function") {
      // Very old browser: thumbnails stay usable as plain images.
      root.classList.add("is-ready", "no-lightbox");
      return;
    }

    var img = utils.qs("[data-lightbox-img]", dialog);
    var caption = utils.qs("[data-lightbox-caption]", dialog);
    var counter = utils.qs("[data-lightbox-count]", dialog);
    var live = utils.qs("[data-lightbox-live]", dialog);
    var figure = utils.qs("[data-lightbox-figure]", dialog);
    var index = 0;
    var opener = null;
    var html = document.documentElement;

    function show(i, announce) {
      index = utils.mod(i, list.length);
      var item = list[index];
      figure.classList.add("is-loading");
      figure.classList.remove("is-error");
      img.removeAttribute("src");
      img.alt = item.alt || "";
      img.sizes = "(min-width: 64em) 80vw, 100vw";
      img.srcset = utils.imageSrcset(item, FULL_WIDTHS);
      img.src = utils.imageUrl(item, 1600);
      caption.textContent = utils.fill(item.caption || "", content);
      counter.textContent = (index + 1) + " / " + list.length;
      if (announce && live) {
        live.textContent = "Photo " + (index + 1) + " of " + list.length + (item.caption ? ": " + utils.fill(item.caption, content) : "");
      }
      // Warm the cache for the neighbours.
      [index + 1, index - 1].forEach(function (n) {
        var pre = new Image();
        pre.src = utils.imageUrl(list[utils.mod(n, list.length)], 1200);
      });
    }

    img.addEventListener("load", function () { figure.classList.remove("is-loading"); });
    img.addEventListener("error", function () {
      if (!img.getAttribute("src")) return;
      figure.classList.remove("is-loading");
      figure.classList.add("is-error");
    });

    function open(i, trigger) {
      opener = trigger || null;
      show(i, false);
      dialog.showModal();
      html.classList.add("is-lightbox-open");
      var close = utils.qs("[data-lightbox-close]", dialog);
      if (close) close.focus();
    }

    function close() {
      if (dialog.open) dialog.close();
    }

    dialog.addEventListener("close", function () {
      html.classList.remove("is-lightbox-open");
      if (live) live.textContent = "";
      if (opener && document.contains(opener)) opener.focus();
      opener = null;
    });

    root.addEventListener("click", function (event) {
      var thumb = event.target.closest("[data-gallery-index]");
      if (!thumb) return;
      open(Number(thumb.getAttribute("data-gallery-index")), thumb);
    });

    dialog.addEventListener("click", function (event) {
      if (event.target === dialog) close(); // backdrop
      var action = event.target.closest("[data-lightbox-prev],[data-lightbox-next],[data-lightbox-close]");
      if (!action) return;
      if (action.hasAttribute("data-lightbox-close")) close();
      else show(index + (action.hasAttribute("data-lightbox-next") ? 1 : -1), true);
    });

    dialog.addEventListener("keydown", function (event) {
      if (event.key === "ArrowRight") { event.preventDefault(); show(index + 1, true); }
      else if (event.key === "ArrowLeft") { event.preventDefault(); show(index - 1, true); }
      else if (event.key === "Home") { event.preventDefault(); show(0, true); }
      else if (event.key === "End") { event.preventDefault(); show(list.length - 1, true); }
    });

    // Horizontal swipe on the photo
    var start = null;
    figure.addEventListener("pointerdown", function (e) {
      if (!e.isPrimary) return;
      start = { x: e.clientX, y: e.clientY, id: e.pointerId };
    });
    figure.addEventListener("pointerup", function (e) {
      if (!start || e.pointerId !== start.id) return;
      var dx = e.clientX - start.x;
      var dy = e.clientY - start.y;
      start = null;
      if (Math.abs(dx) > SWIPE_PX && Math.abs(dx) > Math.abs(dy) * 1.5) show(index + (dx < 0 ? 1 : -1), true);
    });
    figure.addEventListener("pointercancel", function () { start = null; });

    root.classList.add("is-ready");
  }

  A.gallery = { init: init };
})(typeof window !== "undefined" ? (window.Aurelia = window.Aurelia || {}) : (globalThis.Aurelia = globalThis.Aurelia || {}));
