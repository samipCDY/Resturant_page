/*!
 * Aurelia Dining — main.js
 * Boot order + error isolation. One failing component never breaks the rest.
 * Pages only load the component scripts they need; missing modules are skipped.
 */
(function (A) {
  "use strict";

  var root = document.documentElement;
  var content = window.AURELIA_CONTENT;
  var page = document.body.getAttribute("data-page") || "";

  if (!content || typeof content !== "object") {
    console.warn("[Aurelia] content.js did not load (missing file or a syntax error) — showing the defaults from the HTML.");
    content = null;
  }

  function run(name, module, fn) {
    if (!module) return;
    try {
      fn(module);
    } catch (err) {
      console.error("[Aurelia] " + name + " failed to initialise.", err);
    }
  }

  // Content-driven rendering only when content.js is valid; otherwise keep the
  // baked HTML (it is complete) and skip content-dependent widgets.
  if (content) {
    run("content rendering", A.render, function (m) { m.all(content, document, { page: page, runtime: true }); });
    run("content binding", A.bind, function (m) { m.init(content); });
    run("page metadata", A.seo, function (m) { m.init(content); });
  }

  run("hero", A.hero, function (m) { m.init(); });
  run("navigation", A.nav, function (m) { m.init(content || {}); });

  if (content) {
    run("dish wheel", A.wheel, function (m) { m.init(content); });
    run("menu filters", A.menu, function (m) { m.init(content); });
    run("gallery", A.gallery, function (m) { m.init(content); });
    run("reservation form", A.reservation, function (m) { m.init(content); });
  }

  run("scroll reveal", A.reveal, function (m) { m.init(); });

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
