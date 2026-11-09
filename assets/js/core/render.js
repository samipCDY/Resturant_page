/*!
 * Aurelia Dining — core/render.js
 * Registry of pure HTML renderers that turn content.js collections into markup.
 *
 *   <ul data-render="nav" data-variant="mobile"><!--r--> …static fallback… <!--/r--></ul>
 *
 * Renderers are pure functions (content, opts, ctx) → HTML string, or null to keep
 * the existing markup. The same functions run in the browser (live content)
 * and in tools/prerender.mjs (baked static fallback for SEO / no-JS).
 *   opts: the element's data-* attributes (camelCased)
 *   ctx:  { page: <body data-page>, runtime: true in the browser }
 */
(function (A) {
  "use strict";

  var utils = A.utils;
  var registry = {};

  function register(name, fn) {
    registry[name] = fn;
  }

  function datasetOf(el) {
    var out = {};
    Object.keys(el.dataset || {}).forEach(function (k) { out[k] = el.dataset[k]; });
    return out;
  }

  /** Render every [data-render] region inside root (browser). */
  function renderAll(content, root, ctx) {
    utils.qsa("[data-render]", root || document).forEach(function (el) {
      var fn = registry[el.getAttribute("data-render")];
      if (!fn) return;
      var html;
      try {
        html = fn(content, datasetOf(el), ctx);
      } catch (err) {
        console.error("[Aurelia] renderer \"" + el.getAttribute("data-render") + "\" failed; keeping the static content.", err);
        return;
      }
      if (typeof html === "string") el.innerHTML = html;
    });
  }

  /* ---------------------------------------------------------------- helpers */
  var T = function (value, content) { return utils.text(value, content); };
  var M = function (value, content) { return utils.inlineMarkup(value, content); };

  function list(value) {
    return Array.isArray(value) ? value.filter(function (v) { return v != null && v !== ""; }) : [];
  }

  /* ---------------------------------------------------------------- navigation */
  register("nav", function (content, opts, ctx) {
    var variant = opts.variant || "desktop";
    var items = list(content.nav).filter(function (item) {
      if (!item.label || !utils.safeHref(item.href)) return false;
      return variant === "desktop" ? !item.mobileOnly : true;
    });
    if (!items.length) return null;
    return items.map(function (item, i) {
      var current = item.page && ctx && item.page === ctx.page;
      var aria = current ? ' aria-current="page"' : "";
      var href = utils.escapeHtml(utils.safeHref(item.href));
      if (variant === "mobile") {
        return (
          '<li class="mobile-menu__item" style="--i:' + i + '">' +
            '<a class="mobile-menu__link' + (current ? " is-active" : "") + '" href="' + href + '" data-nav-link' + aria + ">" +
              '<span class="mobile-menu__num" aria-hidden="true">' + utils.pad(i + 1) + "</span>" +
              "<span>" + T(item.label, content) + "</span>" +
            "</a>" +
          "</li>"
        );
      }
      if (variant === "footer") {
        return '<li><a class="footer-nav__link" href="' + href + '"' + aria + ">" + T(item.label, content) + "</a></li>";
      }
      return '<li><a class="site-nav__link' + (current ? " is-active" : "") + '" href="' + href + '" data-nav-link' + aria + ">" + T(item.label, content) + "</a></li>";
    }).join("");
  });

  /* ---------------------------------------------------------------- text */
  /** Masked headline lines: data-path="hero.titleLines" */
  register("title-lines", function (content, opts) {
    var lines = list(utils.get(content, opts.path));
    if (!lines.length) return null;
    return lines.map(function (line, i) {
      return '<span class="line"><span class="line__inner" style="--i:' + i + '">' + M(line, content) + "</span></span>";
    }).join(" ");
  });

  /** Paragraph list: data-path="about.story" [data-class="lead"] */
  register("paragraphs", function (content, opts) {
    var paras = list(utils.get(content, opts.path));
    if (!paras.length) return null;
    var cls = opts["class"] ? ' class="' + utils.escapeHtml(opts["class"]) + '"' : "";
    return paras.map(function (p) { return "<p" + cls + ">" + M(p, content) + "</p>"; }).join("");
  });

  register("hero-meta", function (content) {
    var items = list(utils.get(content, "hero.meta"));
    if (!items.length) return null;
    return items.map(function (item) {
      return '<div class="hero__meta-item"><dt>' + T(item.label, content) + "</dt><dd>" + T(item.value, content) + "</dd></div>";
    }).join("");
  });

  /* ---------------------------------------------------------------- contact */
  register("address", function (content) {
    var lines = utils.addressLines(utils.get(content, "contact.address"));
    if (!lines.length) return null;
    return lines.map(function (l) { return T(l, content); }).join("<br>");
  });

  /** Opening hours as <dt>/<dd> rows (container must be a <dl>). */
  register("hours", function (content) {
    var days = list(utils.get(content, "hours.days"));
    if (!days.length) return null;
    return days.map(function (d) {
      return '<div class="hours__row"><dt>' + T(d.label, content) + "</dt><dd>" + T(d.value, content) + "</dd></div>";
    }).join("");
  });

  register("directions", function (content) {
    var items = list(utils.get(content, "contact.directions"));
    if (!items.length) return null;
    return items.map(function (d) {
      return '<div class="directions__item"><dt>' + T(d.label, content) + "</dt><dd>" + T(d.text, content) + "</dd></div>";
    }).join("");
  });

  /** Generic label/value facts: data-path="about.room.facts" (container is a <dl>) */
  register("facts", function (content, opts) {
    var items = list(utils.get(content, opts.path));
    if (!items.length) return null;
    return items.map(function (f) {
      return '<div class="facts__item"><dt>' + T(f.label, content) + "</dt><dd>" + T(f.value, content) + "</dd></div>";
    }).join("");
  });

  A.render = {
    register: register,
    all: renderAll,
    get: function (name) { return registry[name]; },
    names: function () { return Object.keys(registry); }
  };
})(typeof window !== "undefined" ? (window.Aurelia = window.Aurelia || {}) : (globalThis.Aurelia = globalThis.Aurelia || {}));
