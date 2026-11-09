/*!
 * Aurelia Dining — components/menu.js
 * Menu renderers (full menu, preview, legend, tasting menu) and category filters.
 *
 * Filters are toggle buttons (aria-pressed) — actions, not links. Each category
 * is also a real #anchor (menu.html#desserts), so deep links work with or
 * without JavaScript; with JS the matching filter is applied.
 */
(function (A) {
  "use strict";

  var utils = A.utils;
  var register = A.render.register;
  var T = function (v, c) { return utils.text(v, c); };

  function categories(content) {
    var cats = utils.get(content, "menu.categories");
    return Array.isArray(cats) ? cats.filter(function (c) { return c && c.id && c.label && Array.isArray(c.items); }) : [];
  }

  function safeId(id) {
    return String(id).toLowerCase().replace(/[^a-z0-9_-]+/g, "-");
  }

  function dietTags(tags, content) {
    var legend = utils.get(content, "menu.legend") || {};
    var list = Array.isArray(tags) ? tags.filter(Boolean) : [];
    if (!list.length) return "";
    return (
      '<ul class="menu-item__tags" aria-label="Dietary">' +
        list.map(function (tag) {
          var full = legend[tag];
          return full
            ? '<li><span aria-hidden="true">' + T(tag, content) + '</span><span class="visually-hidden">' + T(full, content) + "</span></li>"
            : "<li>" + T(tag, content) + "</li>";
        }).join("") +
      "</ul>"
    );
  }

  function itemHtml(item, content) {
    var price = utils.formatPrice(item.price, content.settings);
    return (
      '<li class="menu-item">' +
        '<div class="menu-item__head">' +
          '<h3 class="menu-item__name">' + T(item.name, content) + "</h3>" +
          '<span class="menu-item__leader" aria-hidden="true"></span>' +
          (price ? '<p class="menu-item__price"><span class="visually-hidden">Price: </span>' + T(price, content) + "</p>" : "") +
        "</div>" +
        (item.description ? '<p class="menu-item__desc">' + T(item.description, content) + "</p>" : "") +
        dietTags(item.tags, content) +
      "</li>"
    );
  }

  /* Full menu, one <section> per category */
  register("menu", function (content) {
    var cats = categories(content);
    if (!cats.length) return null;
    return cats.map(function (cat) {
      var id = safeId(cat.id);
      return (
        '<section class="menu-category" id="' + id + '" aria-labelledby="menu-cat-' + id + '" data-menu-category="' + id + '">' +
          '<h2 class="menu-category__title" id="menu-cat-' + id + '">' + T(cat.label, content) + "</h2>" +
          (cat.intro ? '<p class="menu-category__intro">' + T(cat.intro, content) + "</p>" : "") +
          '<ul class="menu-list" role="list">' + cat.items.filter(function (i) { return i && i.name; }).map(function (i) { return itemHtml(i, content); }).join("") + "</ul>" +
        "</section>"
      );
    }).join("");
  });

  /* Filter buttons: rendered only in the browser (no dead buttons without JS) */
  register("menu-filters", function (content, opts, ctx) {
    if (!ctx || !ctx.runtime) return "";
    var cats = categories(content);
    if (cats.length < 2) return "";
    var buttons = [{ id: "all", label: "All" }].concat(cats.map(function (c) { return { id: safeId(c.id), label: c.label }; }));
    return buttons.map(function (b) {
      return '<button type="button" class="menu-filter" data-filter="' + utils.escapeHtml(b.id) + '" aria-pressed="' + (b.id === "all") + '">' + T(b.label, content) + "</button>";
    }).join("");
  });

  /* Home preview: dishes flagged featured:true */
  register("menu-preview", function (content, opts) {
    var featured = [];
    categories(content).forEach(function (cat) {
      cat.items.forEach(function (item) { if (item && item.featured) featured.push(item); });
    });
    var n = parseInt(opts.limit, 10) || 4;
    featured = featured.slice(0, n);
    if (!featured.length) return null;
    return featured.map(function (i) { return itemHtml(i, content); }).join("");
  });

  register("menu-legend", function (content) {
    var legend = utils.get(content, "menu.legend");
    var keys = legend ? Object.keys(legend) : [];
    if (!keys.length) return null;
    return keys.map(function (k) {
      return '<div class="menu-legend__item"><dt>' + T(k, content) + "</dt><dd>" + T(legend[k], content) + "</dd></div>";
    }).join("");
  });

  register("tasting", function (content) {
    var t = utils.get(content, "menu.tasting");
    if (!t || !t.title) return null;
    var price = utils.formatPrice(t.price, content.settings);
    var courses = Array.isArray(t.courses) ? t.courses.filter(Boolean) : [];
    return (
      '<h2 class="tasting__title" id="tasting-title">' + T(t.title, content) + "</h2>" +
      (t.text ? '<p class="tasting__text">' + T(t.text, content) + "</p>" : "") +
      (courses.length ? '<ol class="tasting__courses">' + courses.map(function (c) { return "<li>" + T(c, content) + "</li>"; }).join("") + "</ol>" : "") +
      '<div class="tasting__footer">' +
        (price ? '<p class="tasting__price">' + T(price, content) + (t.priceLabel ? " <span>" + T(t.priceLabel, content) + "</span>" : "") + "</p>" : "") +
        (t.pairing ? '<p class="tasting__pairing">' + T(t.pairing, content) + "</p>" : "") +
      "</div>"
    );
  });

  /* ------------------------------------------------------------------ filters */
  function initFilters(content) {
    var root = utils.qs("[data-menu]");
    if (!root) return;
    var bar = utils.qs("[data-menu-filters]", root);
    var live = utils.qs("[data-menu-live]", root);
    var sections = utils.qsa("[data-menu-category]", root);
    if (!bar || sections.length < 2) {
      root.classList.add("is-ready");
      return;
    }
    var buttons = utils.qsa("[data-filter]", bar);

    function count(section) {
      return utils.qsa(".menu-item", section).length;
    }

    function apply(filter, opts) {
      var o = opts || {};
      var valid = filter === "all" || sections.some(function (s) { return s.getAttribute("data-menu-category") === filter; });
      if (!valid) filter = "all";

      sections.forEach(function (s) {
        s.hidden = filter !== "all" && s.getAttribute("data-menu-category") !== filter;
      });
      buttons.forEach(function (b) {
        b.setAttribute("aria-pressed", String(b.getAttribute("data-filter") === filter));
      });

      if (live && o.announce) {
        var shown = sections.filter(function (s) { return !s.hidden; });
        var total = shown.reduce(function (n, s) { return n + count(s); }, 0);
        var label = filter === "all" ? "all categories" : (utils.qs("[data-filter='" + filter + "']", bar) || {}).textContent;
        live.textContent = "Showing " + label + ": " + total + (total === 1 ? " item." : " items.");
      }

      if (o.updateHash && window.history && history.replaceState) {
        var url = location.pathname + location.search + (filter === "all" ? "" : "#" + filter);
        history.replaceState(null, "", url);
      }
    }

    bar.addEventListener("click", function (event) {
      var button = event.target.closest("[data-filter]");
      if (!button) return;
      apply(button.getAttribute("data-filter"), { announce: true, updateHash: true });
    });

    function fromHash() {
      var hash = decodeURIComponent((location.hash || "").replace(/^#/, ""));
      if (hash && sections.some(function (s) { return s.getAttribute("data-menu-category") === hash; })) {
        apply(hash, {});
      }
    }

    window.addEventListener("hashchange", fromHash);
    fromHash();
    root.classList.add("is-ready");
  }

  A.menu = { init: initFilters };
})(typeof window !== "undefined" ? (window.Aurelia = window.Aurelia || {}) : (globalThis.Aurelia = globalThis.Aurelia || {}));
