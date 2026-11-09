/*!
 * Aurelia Dining — core/bind.js
 * Writes single values from content.js into the page.
 *
 *   data-bind="path"        → textContent (escaped, brand tokens filled)
 *   data-bind-html="path"   → escaped text with *em* support
 *   data-bind-href="path"   → href (unsafe schemes refused, element left as-is)
 *
 * Computed paths: $fullName, $map (directions URL), $addressInline, $year
 * Collections are handled by core/render.js ([data-render]).
 */
(function (A) {
  "use strict";

  var utils = A.utils;

  var COMPUTED = {
    $fullName: function (c) { return utils.fill("{fullName}", c); },
    $map: function (c) { return utils.mapUrl(c.contact); },
    $addressInline: function (c) { return utils.addressLines(c.contact && c.contact.address).join(", "); },
    $year: function () { return String(new Date().getFullYear()); }
  };

  /** Resolve a bind path to a string (or undefined). Shared with tools/prerender.mjs. */
  function resolve(content, path) {
    var value = COMPUTED[path] ? COMPUTED[path](content) : utils.get(content, path);
    if (value == null || value === "" || typeof value === "object") return undefined;
    return utils.fill(value, content);
  }

  function bindValues(content, root) {
    utils.qsa("[data-bind]", root).forEach(function (el) {
      var value = resolve(content, el.getAttribute("data-bind"));
      if (value !== undefined) el.textContent = value;
    });

    utils.qsa("[data-bind-html]", root).forEach(function (el) {
      var value = resolve(content, el.getAttribute("data-bind-html"));
      if (value !== undefined) el.innerHTML = utils.inlineMarkup(value, content);
    });

    utils.qsa("[data-bind-href]", root).forEach(function (el) {
      var value = resolve(content, el.getAttribute("data-bind-href"));
      var href = value !== undefined ? utils.safeHref(value) : "";
      if (href) el.setAttribute("href", href);
    });

    utils.qsa("img[data-bind-img]", root).forEach(function (img) {
      var attrs = imageAttrs(content, img.getAttribute("data-bind-img"), img.getAttribute("data-widths"), img.getAttribute("data-aspect"));
      if (!attrs) return;
      // Only touch the element when something changed (no duplicate downloads).
      if (attrs.srcset && img.getAttribute("srcset") !== attrs.srcset) img.setAttribute("srcset", attrs.srcset);
      if (img.getAttribute("src") !== attrs.src) img.setAttribute("src", attrs.src);
      img.alt = attrs.alt;
    });
  }

  /**
   * <img data-bind-img="about.image" data-widths="480,720,960" data-aspect="0.8">
   * → { src, srcset, alt } from a content image. Shared with tools/prerender.mjs.
   */
  function imageAttrs(content, path, widthsAttr, aspectAttr) {
    var image = utils.get(content, path);
    if (!image || typeof image !== "object" || !image.src) return null;
    var widths = String(widthsAttr || "").split(",").map(Number).filter(function (n) { return n > 0; });
    var aspect = parseFloat(aspectAttr) || undefined;
    return {
      src: utils.imageUrl(image, widths[widths.length - 1], aspect),
      srcset: utils.imageSrcset(image, widths.length ? widths : null, aspect),
      alt: utils.fill(image.alt || "", content)
    };
  }

  A.bind = {
    init: function (content) {
      bindValues(content, document);
    },
    values: bindValues,
    resolve: resolve,
    imageAttrs: imageAttrs
  };
})(typeof window !== "undefined" ? (window.Aurelia = window.Aurelia || {}) : (globalThis.Aurelia = globalThis.Aurelia || {}));
