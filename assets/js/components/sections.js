/*!
 * Aurelia Dining — components/sections.js
 * Renderers for content sections shared by several pages
 * (signature cards, experience, values, testimonials, gallery preview, chef principles).
 * Pure string builders: also used by tools/prerender.mjs.
 */
(function (A) {
  "use strict";

  var utils = A.utils;
  var register = A.render.register;
  var T = function (v, c) { return utils.text(v, c); };
  var M = function (v, c) { return utils.inlineMarkup(v, c); };

  function list(value) {
    return Array.isArray(value) ? value.filter(Boolean) : [];
  }

  function limit(items, opts) {
    var n = parseInt(opts.limit, 10);
    return n > 0 ? items.slice(0, n) : items;
  }

  /* Signature dish cards (signature.html) — same data as the wheel */
  register("signature-cards", function (content, opts) {
    var dishes = limit(list(utils.get(content, "wheel.dishes")).filter(function (d) { return d.name; }), opts);
    if (!dishes.length) return null;
    return dishes.map(function (dish, i) {
      var price = utils.formatPrice(dish.price, content.settings);
      var tags = list(dish.tags);
      return (
        '<li class="dish-card">' +
          '<article class="dish-card__inner" aria-labelledby="dish-card-' + i + '">' +
            '<div class="dish-card__media">' +
              utils.imgTag(dish.image, {
                widths: [360, 540, 720], aspect: 1,
                sizes: "(min-width: 64em) 23rem, (min-width: 40em) calc(50vw - 3rem), calc(100vw - 2rem)",
                alt: (dish.image && dish.image.alt) || ""
              }) +
            "</div>" +
            '<div class="dish-card__body">' +
              '<p class="dish-card__num" aria-hidden="true">' + utils.pad(i + 1) + "</p>" +
              '<h3 class="dish-card__name" id="dish-card-' + i + '">' + T(dish.name, content) + "</h3>" +
              (dish.description ? '<p class="dish-card__desc">' + T(dish.description, content) + "</p>" : "") +
              (tags.length ? '<ul class="tag-list" aria-label="Notes">' + tags.map(function (t) { return "<li>" + T(t, content) + "</li>"; }).join("") + "</ul>" : "") +
              '<div class="dish-card__footer">' +
                (price ? '<p class="dish-card__price"><span class="visually-hidden">Price: </span>' + T(price, content) + "</p>" : "") +
                (dish.pairing ? '<p class="dish-card__pairing"><span>Pairs with</span> ' + T(dish.pairing, content) + "</p>" : "") +
              "</div>" +
            "</div>" +
          "</article>" +
        "</li>"
      );
    }).join("");
  });

  /* Experience cards (home, about) */
  register("experience", function (content) {
    var items = list(utils.get(content, "experience.items"));
    if (!items.length) return null;
    return items.map(function (item) {
      return (
        '<li class="experience-card">' +
          '<div class="experience-card__media">' +
            utils.imgTag(item.image, {
              widths: [400, 640, 900], aspect: 4 / 3,
              sizes: "(min-width: 60em) 24rem, (min-width: 40em) calc(50vw - 3rem), calc(100vw - 2rem)"
            }) +
          "</div>" +
          '<div class="experience-card__body">' +
            '<h3 class="experience-card__title">' + T(item.title, content) + "</h3>" +
            '<p class="experience-card__text">' + T(item.text, content) + "</p>" +
            (item.detail ? '<p class="experience-card__detail">' + T(item.detail, content) + "</p>" : "") +
          "</div>" +
        "</li>"
      );
    }).join("");
  });

  /* Numbered value / principle list: data-path="about.values" */
  register("pillars", function (content, opts) {
    var items = list(utils.get(content, opts.path));
    if (!items.length) return null;
    return items.map(function (item, i) {
      return (
        '<li class="pillar">' +
          '<p class="pillar__num" aria-hidden="true">' + utils.pad(i + 1) + "</p>" +
          '<h3 class="pillar__title">' + T(item.title, content) + "</h3>" +
          '<p class="pillar__text">' + T(item.text, content) + "</p>" +
        "</li>"
      );
    }).join("");
  });

  /* Sample testimonials, always labelled as samples */
  register("testimonials", function (content) {
    var t = content.testimonials || {};
    var items = list(t.items);
    if (!items.length) return null;
    return items.map(function (item) {
      return (
        '<li class="testimonial">' +
          '<figure class="testimonial__figure">' +
            '<blockquote class="testimonial__quote"><p>' + T(item.quote, content) + "</p></blockquote>" +
            '<figcaption class="testimonial__cite">' +
              '<span class="testimonial__name">' + T(item.name, content) + "</span>" +
              (item.context ? '<span class="testimonial__context">' + T(item.context, content) + "</span>" : "") +
            "</figcaption>" +
          "</figure>" +
        "</li>"
      );
    }).join("");
  });

  /* Home gallery preview: thumbnails are LINKS to gallery.html (navigation) */
  register("gallery-strip", function (content, opts) {
    var items = limit(list(utils.get(content, "gallery.items")).filter(function (g) { return g.src; }), opts);
    if (!items.length) return null;
    var href = utils.escapeHtml(utils.safeHref(opts.href || "gallery.html"));
    return items.map(function (item) {
      return (
        '<li class="gallery-strip__item">' +
          '<a class="gallery-strip__link" href="' + href + '">' +
            utils.imgTag(item, {
              widths: [240, 360, 520], aspect: 1,
              sizes: "(min-width: 60em) 12rem, (min-width: 40em) 30vw, 45vw",
              alt: ""
            }) +
            '<span class="gallery-strip__caption">' + T(item.caption || item.alt, content) + "</span>" +
          "</a>" +
        "</li>"
      );
    }).join("");
  });

  /* Chef quote */
  register("quote", function (content, opts) {
    var text = utils.get(content, opts.path);
    if (!text) return null;
    return "<p>" + M(text, content) + "</p>";
  });

  /* Opening-hours summary rows as a simple list (footer) */
  register("hours-compact", function (content) {
    var days = list(utils.get(content, "hours.days"));
    if (!days.length) return null;
    return days.map(function (d) {
      return '<li><span class="hours-compact__day">' + T(d.label, content) + '</span> <span class="hours-compact__time">' + T(d.value, content) + "</span></li>";
    }).join("");
  });
})(typeof window !== "undefined" ? (window.Aurelia = window.Aurelia || {}) : (globalThis.Aurelia = globalThis.Aurelia || {}));
