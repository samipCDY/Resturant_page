/*!
 * Aurelia Dining — components/nav.js
 * Fixed header, accessible mobile menu, current-page marking.
 *
 * Header behaviour (same on every page):
 *  - always fixed and visible at the top of the viewport while scrolling;
 *  - transparent over the hero, then a solid blurred bar once the page has
 *    scrolled past SOLID_AFTER px (is-scrolled).
 */
(function (A) {
  "use strict";

  var utils = A.utils;
  var FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])';
  var SOLID_AFTER = 24;     // px scrolled before the header gets its solid background

  function isVisible(el) {
    return !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);
  }

  function init(content) {
    var header = utils.qs("[data-header]");
    if (!header) return;

    var toggle = utils.qs("[data-nav-toggle]", header);
    var menu = utils.qs("[data-mobile-menu]");
    var root = document.documentElement;
    var desktop = window.matchMedia("(min-width: 64em)");
    var page = document.body.getAttribute("data-page") || "";
    var isOpen = false;

    /* ---- Current page: the header CTA (nav links are marked by the renderer) */
    var ctaPage = utils.get(content, "navCta.page");
    utils.qsa("[data-nav-cta]").forEach(function (cta) {
      if (ctaPage && ctaPage === page) cta.setAttribute("aria-current", "page");
      else cta.removeAttribute("aria-current");
    });

    /* ---- Mobile menu ------------------------------------------------------- */
    function backgroundRegions() {
      return utils.qsa("main, footer, .skip-link");
    }

    function setOpen(open, options) {
      if (!toggle || !menu || open === isOpen) return;
      var opts = options || {};
      isOpen = open;

      toggle.setAttribute("aria-expanded", String(open));
      header.classList.toggle("is-menu-open", open);
      menu.classList.toggle("is-open", open);
      menu.inert = !open; // unreachable at once while the close animation plays
      root.classList.toggle("is-scroll-locked", open);
      backgroundRegions().forEach(function (el) {
        if (open) el.setAttribute("inert", "");
        else el.removeAttribute("inert");
      });

      if (open) {
        var first = utils.qs(FOCUSABLE, menu);
        if (first) first.focus({ preventScroll: true });
      } else if (opts.restoreFocus !== false) {
        toggle.focus({ preventScroll: true });
      }
    }

    function trapFocus(event) {
      if (!isOpen || event.key !== "Tab") return;
      var items = utils.qsa(FOCUSABLE, header).concat(utils.qsa(FOCUSABLE, menu)).filter(isVisible);
      if (!items.length) return;
      var first = items[0];
      var last = items[items.length - 1];
      var active = document.activeElement;
      var inside = items.indexOf(active) !== -1;
      if (event.shiftKey && (active === first || !inside)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (active === last || !inside)) {
        event.preventDefault();
        first.focus();
      }
    }

    if (toggle && menu) {
      menu.inert = true;
      toggle.addEventListener("click", function () {
        setOpen(!isOpen);
      });

      menu.addEventListener("click", function (event) {
        if (!event.target.closest("a[href]")) return;
        // Close before the browser follows the link so scrolling is unlocked.
        setOpen(false, { restoreFocus: false });
      });

      document.addEventListener("keydown", function (event) {
        if (event.key === "Escape" && isOpen) {
          event.preventDefault();
          setOpen(false);
        }
        trapFocus(event);
      });

      var onBreakpoint = function (event) {
        if (event.matches && isOpen) setOpen(false, { restoreFocus: false });
      };
      if (desktop.addEventListener) desktop.addEventListener("change", onBreakpoint);
      else if (desktop.addListener) desktop.addListener(onBreakpoint);

      // The toggle is only shown once it actually works (see nav.css fallback).
      root.classList.add("has-nav");
    }

    /* ---- Header links (brand, desktop nav, Reserve) ------------------------ */
    // The header stays interactive above the open overlay, so any link in it
    // must close the overlay too; otherwise scrolling stays locked and <main> inert.
    header.addEventListener("click", function (event) {
      var link = event.target.closest("a[href]");
      if (!link) return;
      if (isOpen) setOpen(false, { restoreFocus: false });
    });

    /* ---- Solid background once scrolled (the header never hides) ---------- */
    var onScroll = utils.rafThrottle(function () {
      header.classList.toggle("is-scrolled", window.scrollY > SOLID_AFTER);
    });

    window.addEventListener("scroll", onScroll, { passive: true });
    header.classList.toggle("is-scrolled", window.scrollY > SOLID_AFTER);
  }

  A.nav = { init: init };
})(typeof window !== "undefined" ? (window.Aurelia = window.Aurelia || {}) : (globalThis.Aurelia = globalThis.Aurelia || {}));
