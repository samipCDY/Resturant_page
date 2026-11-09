/*!
 * Aurelia Dining — components/nav.js
 * Header scroll states, accessible mobile menu, scrollspy.
 */
(function (A) {
  "use strict";

  var utils = A.utils;
  var FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])';

  function isVisible(el) {
    return !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);
  }

  function init() {
    var header = utils.qs("[data-header]");
    if (!header) return;

    var toggle = utils.qs("[data-nav-toggle]", header);
    var menu = utils.qs("[data-mobile-menu]");
    var root = document.documentElement;
    var desktop = window.matchMedia("(min-width: 64em)");
    var isOpen = false;
    var lastY = window.scrollY;
    var holdVisibleUntil = 0;

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
        header.classList.remove("is-hidden");
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
        var link = event.target.closest("a[href]");
        if (!link) return;
        holdVisibleUntil = performance.now() + 1500;
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
      if ((link.getAttribute("href") || "").charAt(0) === "#") holdVisibleUntil = performance.now() + 1500;
      if (isOpen) setOpen(false, { restoreFocus: false });
    });

    /* ---- Header on scroll: solid background + hide on scroll down --------- */

    header.addEventListener("focusin", function () {
      header.classList.remove("is-hidden");
    });

    var onScroll = utils.rafThrottle(function () {
      var y = window.scrollY;
      header.classList.toggle("is-scrolled", y > 24);

      var delta = y - lastY;
      if (Math.abs(delta) < 6) return;
      lastY = y;

      if (isOpen || header.contains(document.activeElement) || performance.now() < holdVisibleUntil) {
        header.classList.remove("is-hidden");
        return;
      }
      if (delta > 0 && y > window.innerHeight * 0.6) header.classList.add("is-hidden");
      else if (delta < 0) header.classList.remove("is-hidden");
    });

    window.addEventListener("scroll", onScroll, { passive: true });
    header.classList.toggle("is-scrolled", window.scrollY > 24);

    /* ---- Scrollspy ----------------------------------------------------------- */
    var links = utils.qsa("[data-nav-link]");
    if (!links.length || !("IntersectionObserver" in window)) return;

    var sections = [];
    links.forEach(function (link) {
      var id = (link.getAttribute("href") || "").replace(/^#/, "");
      var section = id && document.getElementById(id);
      if (section && sections.indexOf(section) === -1) sections.push(section);
    });

    function setCurrent(id) {
      links.forEach(function (link) {
        var on = link.getAttribute("href") === "#" + id;
        link.classList.toggle("is-active", on);
        if (on) link.setAttribute("aria-current", "location");
        else link.removeAttribute("aria-current");
      });
    }

    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) setCurrent(entry.target.id);
      });
    }, { rootMargin: "-45% 0px -50% 0px" });

    sections.forEach(function (section) { spy.observe(section); });

    // Clear the highlight while the hero is in view.
    var top = document.getElementById("top");
    if (top) {
      new IntersectionObserver(function (entries) {
        if (entries[0].isIntersecting) setCurrent("");
      }, { rootMargin: "-45% 0px -50% 0px" }).observe(top);
    }
  }

  A.nav = { init: init };
})(window.Aurelia = window.Aurelia || {});
