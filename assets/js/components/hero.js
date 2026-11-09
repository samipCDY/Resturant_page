/*!
 * Aurelia Dining — components/hero.js
 * Light parallax on the hero photo (home and inner-page heroes).
 * Wide screens only, off for reduced motion, idle while the hero is off-screen.
 * Headline lines and the meta strip are rendered by core/render.js.
 */
(function (A) {
  "use strict";

  var utils = A.utils;

  function parallax(hero, media) {
    if (!media) return;
    var wide = window.matchMedia("(min-width: 48em)");
    var inView = true;
    var listening = false;

    var update = utils.rafThrottle(function () {
      if (!inView || !wide.matches || utils.prefersReducedMotion()) {
        media.style.transform = "";
        return;
      }
      var y = Math.min(window.scrollY, hero.offsetHeight);
      media.style.transform = "translate3d(0," + (y * 0.22).toFixed(1) + "px,0)";
    });

    function listen(on) {
      if (on === listening) return;
      listening = on;
      var method = on ? "addEventListener" : "removeEventListener";
      window[method]("scroll", update, { passive: true });
    }

    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (entries) {
        inView = entries[0].isIntersecting;
        listen(inView); // no scroll work at all once the hero has left the screen
        update();
      }).observe(hero);
    } else {
      listen(true);
    }

    window.addEventListener("resize", update, { passive: true });
    utils.onReducedMotionChange(update);
  }

  A.hero = {
    init: function () {
      var hero = utils.qs("[data-hero]");
      if (!hero) return;
      parallax(hero, utils.qs("[data-hero-media]", hero));
    }
  };
})(window.Aurelia = window.Aurelia || {});
