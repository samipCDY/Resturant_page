/*!
 * Aurelia Dining — core/bind.js
 * Writes values from content.js into the page.
 *
 *   data-bind="path"        → textContent (escaped)
 *   data-bind-html="path"   → escaped text with *em* support
 *   data-bind-href="path"   → href (script URLs refused)
 *   data-render="nav"       → navigation list (data-variant="desktop|mobile")
 */
(function (A) {
  "use strict";

  var utils = A.utils;

  function isFilled(value) {
    return value != null && value !== "";
  }

  function bindValues(content, root) {
    utils.qsa("[data-bind]", root).forEach(function (el) {
      var value = utils.get(content, el.getAttribute("data-bind"));
      if (isFilled(value) && typeof value !== "object") el.textContent = value;
    });

    utils.qsa("[data-bind-html]", root).forEach(function (el) {
      var value = utils.get(content, el.getAttribute("data-bind-html"));
      if (typeof value === "string" && value) el.innerHTML = utils.inlineMarkup(value);
    });

    utils.qsa("[data-bind-href]", root).forEach(function (el) {
      var value = utils.get(content, el.getAttribute("data-bind-href"));
      if (typeof value === "string" && value) el.setAttribute("href", utils.safeHref(value));
    });
  }

  function navItem(item, index, variant) {
    var href = utils.escapeHtml(utils.safeHref(item.href));
    var label = utils.escapeHtml(item.label);
    if (variant === "mobile") {
      return (
        '<li class="mobile-menu__item" style="--i:' + index + '">' +
          '<a class="mobile-menu__link" href="' + href + '" data-nav-link>' +
            '<span class="mobile-menu__num" aria-hidden="true">' + utils.pad(index + 1) + "</span>" +
            "<span>" + label + "</span>" +
          "</a>" +
        "</li>"
      );
    }
    return '<li><a class="site-nav__link" href="' + href + '" data-nav-link>' + label + "</a></li>";
  }

  function renderNav(content) {
    var items = Array.isArray(content.nav) ? content.nav.filter(function (i) { return i && i.label && i.href; }) : [];
    if (!items.length) return;
    utils.qsa('[data-render="nav"]').forEach(function (list) {
      var variant = list.getAttribute("data-variant") || "desktop";
      list.innerHTML = items.map(function (item, i) { return navItem(item, i, variant); }).join("");
    });
  }

  A.bind = {
    init: function (content) {
      renderNav(content);
      bindValues(content, document);
    },
    values: bindValues
  };
})(window.Aurelia = window.Aurelia || {});
