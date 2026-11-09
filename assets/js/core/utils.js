/*!
 * Aurelia Dining — core/utils.js
 * Small, dependency-free helpers shared by every component.
 */
(function (A) {
  "use strict";

  var reducedQuery = window.matchMedia ? window.matchMedia("(prefers-reduced-motion: reduce)") : null;
  var priceFormatters = new Map();
  var ESCAPES = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
  var UNSPLASH = /^https:\/\/images\.unsplash\.com\//;

  var utils = {
    qs: function (selector, root) {
      return (root || document).querySelector(selector);
    },

    qsa: function (selector, root) {
      return Array.prototype.slice.call((root || document).querySelectorAll(selector));
    },

    /** Read "a.b.c" from an object; returns undefined when any step is missing. */
    get: function (obj, path) {
      return String(path).split(".").reduce(function (acc, key) {
        return acc == null ? undefined : acc[key];
      }, obj);
    },

    escapeHtml: function (value) {
      return String(value == null ? "" : value).replace(/[&<>"']/g, function (c) {
        return ESCAPES[c];
      });
    },

    /** Escape, then allow *word* → <em>word</em>. The only markup content may use. */
    inlineMarkup: function (value) {
      return utils.escapeHtml(value).replace(/\*([^*]+)\*/g, "<em>$1</em>");
    },

    /** Refuse script URLs; everything else (#hash, /path, https:, tel:, mailto:) passes. */
    safeHref: function (value) {
      var href = String(value == null ? "" : value).trim();
      return /^(javascript|data|vbscript):/i.test(href.replace(/[\s\u0000-\u001f]/g, "")) ? "#" : href;
    },

    mod: function (n, m) {
      return ((n % m) + m) % m;
    },

    pad: function (n) {
      return String(n).padStart(2, "0");
    },

    prefersReducedMotion: function () {
      return !!(reducedQuery && reducedQuery.matches);
    },

    onReducedMotionChange: function (callback) {
      if (!reducedQuery) return;
      var handler = function (event) { callback(event.matches); };
      if (reducedQuery.addEventListener) reducedQuery.addEventListener("change", handler);
      else if (reducedQuery.addListener) reducedQuery.addListener(handler);
    },

    /** Format numbers with Intl currency rules; strings pass through untouched. */
    formatPrice: function (value, settings) {
      if (value == null || value === "") return "";
      if (typeof value !== "number" || !isFinite(value)) return String(value);
      var s = settings || {};
      var locale = s.locale || "en-US";
      var currency = s.currency || "USD";
      var digits = typeof s.priceDecimals === "number" ? s.priceDecimals : 0;
      var key = locale + "|" + currency + "|" + digits;
      if (!priceFormatters.has(key)) {
        try {
          priceFormatters.set(key, new Intl.NumberFormat(locale, {
            style: "currency",
            currency: currency,
            minimumFractionDigits: digits,
            maximumFractionDigits: digits
          }));
        } catch (err) {
          priceFormatters.set(key, null);
        }
      }
      var formatter = priceFormatters.get(key);
      return formatter ? formatter.format(value) : currency + " " + value.toFixed(digits);
    },

    /** Build a sized URL for Unsplash images; other sources are returned unchanged. */
    imageUrl: function (image, width, aspect) {
      var src = typeof image === "string" ? image : image && image.src;
      if (!src) return "";
      if (!UNSPLASH.test(src) || !width) return src;
      try {
        var url = new URL(src);
        url.searchParams.set("auto", "format");
        url.searchParams.set("fit", "crop");
        url.searchParams.set("w", String(width));
        if (aspect) url.searchParams.set("h", String(Math.round(width / aspect)));
        if (!url.searchParams.has("q")) url.searchParams.set("q", "70");
        return url.toString();
      } catch (err) {
        return src;
      }
    },

    imageSrcset: function (image, widths, aspect) {
      if (!image) return "";
      if (image.srcset) return image.srcset;
      if (!UNSPLASH.test(image.src || "") || !widths) return "";
      return widths.map(function (w) {
        return utils.imageUrl(image, w, aspect) + " " + w + "w";
      }).join(", ");
    },

    /**
     * Create an <img> with responsive sources.
     * opts: { widths, aspect, sizes, width, height, lazy, alt, className }
     */
    createImage: function (image, opts) {
      var o = opts || {};
      var img = document.createElement("img");
      if (o.className) img.className = o.className;
      img.decoding = "async";
      img.loading = o.lazy === false ? "eager" : "lazy";
      img.draggable = false;
      img.alt = o.alt != null ? o.alt : (image && image.alt) || "";
      if (o.width) img.width = o.width;
      if (o.height) img.height = o.height;
      if (!image || !image.src) return img;
      var srcset = utils.imageSrcset(image, o.widths, o.aspect);
      if (srcset) {
        img.sizes = o.sizes || "100vw";
        img.srcset = srcset;
      }
      var fallbackWidth = o.widths ? o.widths[o.widths.length - 1] : 0;
      img.src = utils.imageUrl(image, fallbackWidth, o.aspect);
      return img;
    },

    /** Call fn at most once per animation frame. */
    rafThrottle: function (fn) {
      var queued = false;
      return function () {
        if (queued) return;
        queued = true;
        window.requestAnimationFrame(function () {
          queued = false;
          fn();
        });
      };
    }
  };

  A.utils = utils;
})(window.Aurelia = window.Aurelia || {});
