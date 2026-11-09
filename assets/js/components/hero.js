/*!
 * Aurelia Dining — components/hero.js
 * Renders the masked headline lines and meta strip from content.js,
 * and adds a light parallax to the hero photo (wide screens, motion allowed).
 */
(function (A) {
  "use strict";

  var utils = A.utils;

  function renderTitle(title, lines) {
    if (!title || !Array.isArray(lines) || !lines.length) return;
    title.innerHTML = lines.map(function (line, i) {
      return '<span class="line"><span class="line__inner" style="--i:' + i + '">' + utils.inlineMarkup(line) + "</span></span>";
    }).join(" ");
  }

  function renderMeta(list, items) {
    if (!list || !Array.isArray(items) || !items.length) return;
    list.innerHTML = items.map(function (item) {
      return (
        '<div class="hero__meta-item">' +
          "<dt>" + utils.escapeHtml(item.label) + "</dt>" +
          "<dd>" + utils.escapeHtml(item.value) + "</dd>" +
        "</div>"
      );
    }).join("");
  }

  function parallax(hero, media) {
    if (!media) return;
    var wide = window.matchMedia("(min-width: 48em)");
    var inView = true;

    var update = utils.rafThrottle(function () {
      if (!inView || !wide.matches || utils.prefersReducedMotion()) {
        media.style.transform = "";
        return;
      }
      var y = Math.min(window.scrollY, hero.offsetHeight);
      media.style.transform = "translate3d(0," + (y * 0.22).toFixed(1) + "px,0)";
    });

    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (entries) {
        inView = entries[0].isIntersecting;
        update();
      }).observe(hero);
    }

    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update, { passive: true });
    utils.onReducedMotionChange(update);
  }

  A.hero = {
    init: function (content) {
      var hero = utils.qs("[data-hero]");
      if (!hero) return;
      var data = (content && content.hero) || {};
      renderTitle(utils.qs("[data-hero-title]", hero), data.titleLines);
      renderMeta(utils.qs("[data-hero-meta]", hero), data.meta);
      parallax(hero, utils.qs("[data-hero-media]", hero));
    }
  };
})(window.Aurelia = window.Aurelia || {});
