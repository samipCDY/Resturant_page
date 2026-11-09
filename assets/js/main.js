/*!
 * Aurelia Dining — main.js
 * Boot order + error isolation. One failing component never breaks the rest.
 */
(function (A) {
  "use strict";

  var root = document.documentElement;
  var content = window.AURELIA_CONTENT;

  if (!content) {
    console.warn("[Aurelia] content.js did not load — showing the defaults from index.html.");
    content = {};
  }

  function run(name, fn) {
    try {
      fn();
    } catch (err) {
      console.error("[Aurelia] " + name + " failed to initialise.", err);
    }
  }

  run("content binding", function () { A.bind.init(content); });
  run("hero", function () { A.hero.init(content); });
  run("navigation", function () { A.nav.init(content); });
  run("dish wheel", function () { A.wheel.init(content); });
  run("scroll reveal", function () { A.reveal.init(); });

  run("footer year", function () {
    A.utils.qsa("[data-year]").forEach(function (el) {
      el.textContent = String(new Date().getFullYear());
    });
  });

  // Start entrance animations once fonts are in (or after 700ms at most),
  // so headlines don't animate in a fallback face and then swap.
  var fontsReady = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
  var timeout = new Promise(function (resolve) { window.setTimeout(resolve, 700); });
  Promise.race([fontsReady, timeout]).then(function () {
    window.requestAnimationFrame(function () {
      root.classList.add("is-ready");
    });
  });
})(window.Aurelia = window.Aurelia || {});
