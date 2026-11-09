/*!
 * Aurelia Dining — core/seo.js
 * Page metadata and schema.org data from content.js.
 *
 *  - meta(content, page): { title, description, image, url } for a page
 *  - schema(content): schema.org Restaurant object (null when disabled)
 *  - init(content): updates <title>, description, Open Graph/Twitter tags and
 *    the JSON-LD block in the browser.
 *
 * Social-media scrapers do NOT run JavaScript, so the static <head> must also
 * be correct: run `node tools/prerender.mjs` after editing content.js, or edit
 * the <head> of each page by hand (see CUSTOMIZATION.md).
 */
(function (A) {
  "use strict";

  var utils = A.utils;
  var PAGE_FILES = {
    home: "index.html", about: "about.html", signature: "signature.html", menu: "menu.html",
    chef: "chef.html", gallery: "gallery.html", reservations: "reservations.html", contact: "contact.html"
  };
  var DAY = /^(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)$/;
  var TIME = /^\d{2}:\d{2}$/;

  /** Absolute URL for a page when site.url is set, else "". */
  function pageUrl(content, page) {
    var base = utils.get(content, "site.url");
    if (!base || !/^https:\/\//i.test(base)) return "";
    try {
      var file = PAGE_FILES[page] || "";
      return new URL(page === "home" ? "" : file, base.replace(/\/?$/, "/")).toString();
    } catch (err) {
      return "";
    }
  }

  function meta(content, page) {
    var p = utils.get(content, "pages." + page) || {};
    var img = utils.get(content, "site.socialImage");
    return {
      title: utils.fill(p.title || "{fullName}", content),
      description: utils.fill(p.description || "", content),
      image: img && img.src ? utils.imageUrl(img, 1200, 1200 / 630) : "",
      imageAlt: img && img.alt ? utils.fill(img.alt, content) : "",
      url: pageUrl(content, page)
    };
  }

  function schema(content) {
    if (utils.get(content, "site.structuredData") === false) return null;
    var brand = content.brand || {};
    var contact = content.contact || {};
    var a = contact.address || {};
    var out = {
      "@context": "https://schema.org",
      "@type": "Restaurant",
      name: utils.fill("{fullName}", content)
    };
    var desc = utils.get(content, "pages.home.description");
    if (desc) out.description = utils.fill(desc, content);
    if (brand.cuisine) out.servesCuisine = brand.cuisine;
    if (brand.priceRange) out.priceRange = brand.priceRange;
    if (contact.phone) out.telephone = contact.phone;
    if (contact.email) out.email = contact.email;
    if (a.street || a.locality) {
      out.address = { "@type": "PostalAddress" };
      if (a.street) out.address.streetAddress = a.street;
      if (a.locality) out.address.addressLocality = a.locality;
      if (a.region) out.address.addressRegion = a.region;
      if (a.postalCode) out.address.postalCode = a.postalCode;
      if (a.country) out.address.addressCountry = a.country;
    }
    var hours = (utils.get(content, "hours.schema") || []).filter(function (h) {
      return h && Array.isArray(h.days) && h.days.every(function (d) { return DAY.test(d); }) && TIME.test(h.opens) && TIME.test(h.closes);
    });
    if (hours.length) {
      out.openingHoursSpecification = hours.map(function (h) {
        return { "@type": "OpeningHoursSpecification", dayOfWeek: h.days, opens: h.opens, closes: h.closes };
      });
    }
    var home = pageUrl(content, "home");
    if (home) {
      out.url = home;
      out.menu = pageUrl(content, "menu");
      out.acceptsReservations = pageUrl(content, "reservations");
    } else {
      out.acceptsReservations = true;
    }
    var img = utils.get(content, "site.socialImage");
    if (img && img.src) out.image = utils.imageUrl(img, 1200);
    return out;
  }

  function setMeta(selector, attr, value) {
    var el = document.head.querySelector(selector);
    if (el && value) el.setAttribute(attr, value);
  }

  function init(content) {
    var page = document.body.getAttribute("data-page") || "home";
    var m = meta(content, page);
    if (m.title) document.title = m.title;
    setMeta('meta[name="description"]', "content", m.description);
    setMeta('meta[property="og:title"]', "content", m.title);
    setMeta('meta[property="og:description"]', "content", m.description);
    setMeta('meta[property="og:image"]', "content", m.image);
    setMeta('meta[property="og:image:alt"]', "content", m.imageAlt);
    setMeta('meta[property="og:site_name"]', "content", utils.fill("{fullName}", content));
    setMeta('meta[name="twitter:title"]', "content", m.title);
    setMeta('meta[name="twitter:description"]', "content", m.description);
    setMeta('meta[name="twitter:image"]', "content", m.image);

    if (m.url) {
      var canonical = document.head.querySelector('link[rel="canonical"]');
      if (!canonical) {
        canonical = document.createElement("link");
        canonical.rel = "canonical";
        document.head.appendChild(canonical);
      }
      canonical.href = m.url;
      var ogUrl = document.head.querySelector('meta[property="og:url"]');
      if (!ogUrl) {
        ogUrl = document.createElement("meta");
        ogUrl.setAttribute("property", "og:url");
        document.head.appendChild(ogUrl);
      }
      ogUrl.setAttribute("content", m.url);
    }

    var ld = document.querySelector("script[data-jsonld]");
    if (ld) {
      var data = schema(content);
      if (data) ld.textContent = serialize(data);
      else ld.parentNode.removeChild(ld);
    }
  }

  /** JSON for a <script> block: "<" escaped so content can never close the tag. */
  function serialize(data) {
    return JSON.stringify(data, null, 2).replace(/</g, "\\u003c");
  }

  A.seo = { init: init, meta: meta, schema: schema, serialize: serialize, pageUrl: pageUrl, files: PAGE_FILES };
})(typeof window !== "undefined" ? (window.Aurelia = window.Aurelia || {}) : (globalThis.Aurelia = globalThis.Aurelia || {}));
