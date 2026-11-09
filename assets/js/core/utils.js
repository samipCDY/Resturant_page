/*!
 * Aurelia Dining — core/utils.js
 * Small, dependency-free helpers shared by every component.
 * Everything here is safe to load outside a browser (tools/prerender.mjs).
 */
(function (A) {
  "use strict";

  var hasWindow = typeof window !== "undefined";
  var reducedQuery = hasWindow && window.matchMedia ? window.matchMedia("(prefers-reduced-motion: reduce)") : null;
  var priceFormatters = new Map();
  var warned = {};
  var ESCAPES = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
  var UNSPLASH = /^https:\/\/images\.unsplash\.com\//;
  var SAFE_SCHEME = /^(https?:|mailto:|tel:|sms:)/i;

  function warnOnce(key, message) {
    if (warned[key] || typeof console === "undefined") return;
    warned[key] = true;
    console.warn("[Aurelia] " + message);
  }

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

    /**
     * Brand tokens usable in any content string, so renaming the restaurant in
     * one place updates every sentence:  {name} {descriptor} {fullName}
     * {phone} {email} {established}
     */
    fill: function (value, content) {
      var c = content || (hasWindow && window.AURELIA_CONTENT) || {};
      var brand = c.brand || {};
      var contact = c.contact || {};
      var tokens = {
        name: brand.name || "",
        descriptor: brand.descriptor || "",
        fullName: [brand.name, brand.descriptor].filter(Boolean).join(" "),
        phone: contact.phone || "",
        email: contact.email || "",
        established: brand.established || ""
      };
      return String(value == null ? "" : value).replace(/\{(\w+)\}/g, function (match, key) {
        return Object.prototype.hasOwnProperty.call(tokens, key) ? tokens[key] : match;
      });
    },

    /** Escaped text with brand tokens filled in. */
    text: function (value, content) {
      return utils.escapeHtml(utils.fill(value, content));
    },

    /** Escape, then allow *word* → <em>word</em>. The only markup content may use. */
    inlineMarkup: function (value, content) {
      return utils.text(value, content).replace(/\*([^*]+)\*/g, "<em>$1</em>");
    },

    /**
     * Allow relative URLs, #hashes and http(s)/mailto/tel/sms only.
     * Returns "" for anything else (javascript:, data:, vbscript:, …).
     */
    safeHref: function (value) {
      var href = String(value == null ? "" : value).trim();
      if (!href) return "";
      var compact = href.replace(/[\s\u0000-\u001f]/g, "");
      var scheme = compact.match(/^([a-z][a-z0-9+.-]*):/i);
      if (scheme && !SAFE_SCHEME.test(compact)) return "";
      return href;
    },

    /** Form endpoints must be https (http only for localhost testing). */
    isSafeEndpoint: function (value) {
      if (typeof value !== "string" || !value.trim()) return false;
      try {
        var url = new URL(value.trim());
        if (url.protocol === "https:") return true;
        return url.protocol === "http:" && /^(localhost|127\.0\.0\.1|\[::1\])$/.test(url.hostname);
      } catch (err) {
        return false;
      }
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

    /**
     * Format a price. Numbers use Intl currency rules from `settings`; strings
     * ("Market price") pass through. Never throws: invalid decimals fall back
     * to the currency's default, an invalid locale to en-US, and an invalid
     * currency to a plain number.
     */
    formatPrice: function (value, settings) {
      if (value == null || value === "") return "";
      if (typeof value !== "number" || !isFinite(value)) return String(value);
      var s = settings || {};
      var digits = s.priceDecimals;
      var validDigits = typeof digits === "number" && digits >= 0 && digits <= 4 && Math.floor(digits) === digits;
      if (digits != null && !validDigits) warnOnce("digits", "settings.priceDecimals must be a whole number from 0 to 4; using the currency default.");
      var locale = typeof s.locale === "string" && s.locale.trim() ? s.locale.trim() : "en-US";
      var currency = typeof s.currency === "string" && s.currency.trim() ? s.currency.trim().toUpperCase() : "USD";
      var key = locale + "|" + currency + "|" + (validDigits ? digits : "auto");

      if (!priceFormatters.has(key)) {
        var options = { style: "currency", currency: currency };
        if (validDigits) {
          options.minimumFractionDigits = digits;
          options.maximumFractionDigits = digits;
        }
        var formatter = null;
        var attempts = [locale, "en-US"];
        for (var i = 0; i < attempts.length && !formatter; i++) {
          try { formatter = new Intl.NumberFormat(attempts[i], options); } catch (err) { formatter = null; }
        }
        if (!formatter) {
          warnOnce("currency", 'settings.currency "' + currency + '" is not a valid ISO 4217 code; prices are shown without a currency symbol.');
          var plain = {};
          if (validDigits) { plain.minimumFractionDigits = digits; plain.maximumFractionDigits = digits; }
          try { formatter = new Intl.NumberFormat(locale, plain); } catch (err) { formatter = new Intl.NumberFormat("en-US", plain); }
        } else if (formatter.resolvedOptions().locale && attempts[0] !== "en-US" && !safeLocale(locale)) {
          warnOnce("locale", 'settings.locale "' + locale + '" is not supported; using en-US.');
        }
        priceFormatters.set(key, formatter);
      }
      return priceFormatters.get(key).format(value);
    },

    /** Format "17:30" for display using the configured locale. */
    formatTime: function (value, settings) {
      var m = /^(\d{1,2}):(\d{2})$/.exec(String(value || ""));
      if (!m) return String(value || "");
      var date = new Date(2000, 0, 1, Number(m[1]), Number(m[2]));
      var locale = (settings && settings.locale) || "en-US";
      try {
        return new Intl.DateTimeFormat(locale, { hour: "numeric", minute: "2-digit" }).format(date);
      } catch (err) {
        return new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" }).format(date);
      }
    },

    /** Address lines for display: ["218 Linden Row", "Portland, OR 97204"]. */
    addressLines: function (address) {
      var a = address || {};
      var cityLine = [a.locality, [a.region, a.postalCode].filter(Boolean).join(" ")].filter(Boolean).join(", ");
      return [a.street, a.district, cityLine].filter(Boolean);
    },

    /** Directions link: explicit contact.mapUrl, otherwise an OpenStreetMap search. */
    mapUrl: function (contact) {
      var c = contact || {};
      var explicit = utils.safeHref(c.mapUrl);
      if (explicit) return explicit;
      var a = c.address || {};
      var query = [a.street, a.locality, a.region, a.postalCode, a.country].filter(Boolean).join(", ");
      return query ? "https://www.openstreetmap.org/search?query=" + encodeURIComponent(query) : "";
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
        else url.searchParams.delete("h");
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
     * <img> markup as a string (renderers + prerender tool).
     * opts: { widths, aspect, sizes, width, height, eager, alt, className }
     */
    imgTag: function (image, opts) {
      var o = opts || {};
      if (!image || !image.src) return "";
      var esc = utils.escapeHtml;
      var srcset = utils.imageSrcset(image, o.widths, o.aspect);
      var widest = o.widths ? o.widths[o.widths.length - 1] : 0;
      var width = o.width || widest || 1200;
      var height = o.height || (o.aspect ? Math.round(width / o.aspect) : Math.round(width * 0.66));
      var alt = o.alt != null ? o.alt : image.alt || "";
      return (
        "<img" +
        (o.className ? ' class="' + esc(o.className) + '"' : "") +
        ' src="' + esc(utils.imageUrl(image, widest, o.aspect)) + '"' +
        (srcset ? ' srcset="' + esc(srcset) + '" sizes="' + esc(o.sizes || "100vw") + '"' : "") +
        ' width="' + width + '" height="' + height + '"' +
        ' alt="' + esc(alt) + '"' +
        (o.eager ? "" : ' loading="lazy"') +
        ' decoding="async">'
      );
    },

    /** Create an <img> element with responsive sources (runtime only). */
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

  function safeLocale(locale) {
    try {
      return Intl.NumberFormat.supportedLocalesOf([locale]).length > 0;
    } catch (err) {
      return false;
    }
  }

  A.utils = utils;
})(typeof window !== "undefined" ? (window.Aurelia = window.Aurelia || {}) : (globalThis.Aurelia = globalThis.Aurelia || {}));
