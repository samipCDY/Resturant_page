/*!
 * Aurelia Dining — core/reveal.js
 * Adds .is-revealed to [data-reveal] elements as they scroll into view.
 * The hidden state only exists once this script adds html.has-reveal.
 * Stagger with style="--reveal-delay: 2" (× 110ms).
 */
(function (A) {
  "use strict";

  var utils = A.utils;
  var observer = null;

  function reveal(el) {
    el.classList.add("is-revealed");
  }

  function observe(elements) {
    elements.forEach(function (el) {
      if (el.classList.contains("is-revealed")) return;
      if (observer) observer.observe(el);
      else reveal(el);
    });
  }

  A.reveal = {
    init: function () {
      var elements = utils.qsa("[data-reveal]");
      if (!("IntersectionObserver" in window)) {
        elements.forEach(reveal);
        return;
      }
      observer = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          reveal(entry.target);
          observer.unobserve(entry.target);
        });
      }, { rootMargin: "0px 0px -8% 0px", threshold: 0.1 });

      document.documentElement.classList.add("has-reveal");
      observe(elements);
    },

    /** Register elements created after boot (e.g. rendered from content.js). */
    observe: function (root) {
      observe(utils.qsa("[data-reveal]", root));
    }
  };
})(window.Aurelia = window.Aurelia || {});
