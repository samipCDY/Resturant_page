/*!
 * Aurelia Dining — components/wheel.js
 * The Signature Dish Wheel: an accessible, rotating, swipeable carousel.
 *
 * Pattern: WAI-ARIA "tabbed carousel".
 *   play/pause → previous → next → tablist (roving tabindex) → tabpanels
 * Geometry lives in CSS (wheel.css); JS only sets --n, --plate-ratio and --rot.
 */
(function (A) {
  "use strict";

  var utils = A.utils;

  /* Plate size as a fraction of the stage, so 3–12 dishes never overlap. */
  var PLATE_RATIO = { 3: 0.3, 4: 0.3, 5: 0.28, 6: 0.26, 7: 0.24, 8: 0.22, 9: 0.2, 10: 0.185, 11: 0.17, 12: 0.16 };
  var MIN_INTERVAL = 3500;
  var DRAG_THRESHOLD = 8;        // px before a press becomes a drag
  var FLICK_FRACTION = 0.15;     // of one step: a short flick still advances
  var ACTIVE_SCALE = 1.2;        // must match .is-active .dish-wheel__plate in wheel.css
  var VISIBLE_RATIO = 0.35;      // autoplay only while this much of the stage is on screen
  var PLATE_WIDTHS = [240, 360, 480, 640]; // enough for 3× screens at the largest plate

  /**
   * `sizes` = the ACTIVE plate's rendered width, derived from the real stage
   * width in wheel.css, including container gutters and the desktop grid:
   *   < 40em : stage = min(26rem, container)  container ≈ 96vw − 1.2rem
   *   ≥ 40em : stage = 32rem
   *   ≥ 60em : stage = min(38rem, grid column) column ≈ 48.08vw − 0.634rem
   * Math functions in `sizes` are widely supported; if a browser ignores an
   * entry it falls back to the largest candidate (640w), which is still small.
   */
  function plateSizes(ratio) {
    var f = ratio * ACTIVE_SCALE;
    var n = function (v) { return (v * f).toFixed(2); };
    return "(min-width: 60em) min(" + n(38) + "rem, calc(" + n(48.08) + "vw - " + n(0.634) + "rem)), " +
      "(min-width: 40em) " + n(32) + "rem, " +
      "min(" + n(26) + "rem, calc(" + n(96) + "vw - " + n(1.2) + "rem))";
  }

  function DishWheel(root, config, settings) {
    this.root = root;
    this.config = config;
    this.settings = settings || {};
    this.dishes = config.dishes.filter(function (d) { return d && d.name; });
    this.count = this.dishes.length;
    this.step = 360 / this.count;
    this.index = 0;
    this.turn = 0;               // cumulative steps; rotation = turn × step
    this.drag = null;
    this.suppressClick = false;
    this.timer = 0;
    this.suspended = {};         // reasons autoplay is temporarily held
    this.interval = Math.max(MIN_INTERVAL, Number(config.interval) || 6000);
    this.autoplayAvailable = config.autoplay !== false && this.count > 1;
    this.playing = this.autoplayAvailable && !utils.prefersReducedMotion();
    this.uid = root.id || "dish-wheel";

    this.el = {
      stage: utils.qs("[data-wheel-stage]", root),
      track: utils.qs("[data-wheel-track]", root),
      panels: utils.qs("[data-wheel-panels]", root),
      tabs: utils.qs("[data-wheel-tabs]", root),
      prev: utils.qs("[data-wheel-prev]", root),
      next: utils.qs("[data-wheel-next]", root),
      play: utils.qs("[data-wheel-play]", root),
      live: utils.qs("[data-wheel-live]", root),
      hub: utils.qs("[data-wheel-hub]", root),
      ring: utils.qs(".wheel-btn__ring circle", root)
    };
    this.progress = null;        // Web Animation driving the autoplay ring

    this.build();
    this.bindControls();
    this.bindPointer();
    this.bindAutoplay();
    this.render({});
    root.classList.add("is-ready");
    root.classList.toggle("is-single", this.count < 2);
  }

  /* ------------------------------------------------------------------------ */
  /* Build                                                                     */
  /* ------------------------------------------------------------------------ */
  DishWheel.prototype.build = function () {
    var self = this;
    var el = this.el;
    var total = utils.pad(this.count);
    var ratio = PLATE_RATIO[Math.min(Math.max(this.count, 3), 12)];
    var sizes = plateSizes(ratio);

    el.stage.style.setProperty("--n", String(this.count));
    el.stage.style.setProperty("--plate-ratio", String(ratio));
    this.root.style.setProperty("--wheel-interval", this.interval + "ms");

    var trackFrag = document.createDocumentFragment();
    var tabsFrag = document.createDocumentFragment();
    var panelsHtml = "";

    this.items = [];
    this.tabs = [];

    this.dishes.forEach(function (dish, i) {
      var tabId = self.uid + "-tab-" + i;
      var panelId = self.uid + "-panel-" + i;

      // Plate (decorative: the panel carries the information)
      var item = document.createElement("div");
      item.className = "dish-wheel__item";
      item.style.setProperty("--i", String(i));
      item.setAttribute("data-index", String(i));

      var plate = document.createElement("div");
      plate.className = "dish-wheel__plate";
      plate.setAttribute("data-initial", dish.name.trim().charAt(0));

      var img = utils.createImage(dish.image, {
        widths: PLATE_WIDTHS,
        aspect: 1,
        sizes: sizes,
        width: 480,
        height: 480,
        alt: ""
      });
      if (dish.image && dish.image.src) {
        var markLoaded = function () { plate.classList.add("is-loaded"); };
        img.addEventListener("load", markLoaded, { once: true });
        img.addEventListener("error", function () { plate.classList.add("is-error"); }, { once: true });
        if (img.complete && img.naturalWidth) markLoaded();
      } else {
        plate.classList.add("is-error");
      }

      plate.appendChild(img);
      item.appendChild(plate);
      trackFrag.appendChild(item);
      self.items.push(item);

      // Tab
      var tab = document.createElement("button");
      tab.type = "button";
      tab.className = "wheel-tab";
      tab.id = tabId;
      tab.setAttribute("role", "tab");
      tab.setAttribute("aria-controls", panelId);
      tab.setAttribute("aria-selected", "false");
      tab.setAttribute("data-index", String(i));
      tab.tabIndex = -1;
      tab.innerHTML =
        '<span aria-hidden="true">' + utils.pad(i + 1) + "</span>" +
        '<span class="visually-hidden">' + utils.escapeHtml(dish.name) + "</span>";
      tabsFrag.appendChild(tab);
      self.tabs.push(tab);

      // Panel
      panelsHtml += self.panelHtml(dish, i, total, tabId, panelId);
    });

    el.track.appendChild(trackFrag);
    el.tabs.appendChild(tabsFrag);
    el.panels.innerHTML = panelsHtml;
    this.panels = utils.qsa(".dish-panel", el.panels);
  };

  DishWheel.prototype.panelHtml = function (dish, i, total, tabId, panelId) {
    var esc = utils.escapeHtml;
    var price = utils.formatPrice(dish.price, this.settings);
    var tags = Array.isArray(dish.tags) && dish.tags.length
      ? '<ul class="dish-panel__tags" aria-label="Notes">' +
          dish.tags.map(function (t) { return "<li>" + esc(t) + "</li>"; }).join("") +
        "</ul>"
      : "";
    var footer = "";
    if (price || dish.pairing) {
      footer =
        '<div class="dish-panel__footer">' +
          (price ? '<p class="dish-panel__price"><span class="visually-hidden">Price: </span>' + esc(price) + "</p>" : "") +
          (dish.pairing ? '<p class="dish-panel__pairing"><span>Pairs with</span> ' + esc(dish.pairing) + "</p>" : "") +
        "</div>";
    }
    return (
      // tabindex=0: panels hold no focusable content, so per the WAI-ARIA tabs
      // pattern the panel itself is the next Tab stop after the tablist.
      // Inactive panels are visibility:hidden and therefore not focusable.
      '<div class="dish-panel" role="tabpanel" tabindex="0" id="' + panelId + '" aria-labelledby="' + tabId + '">' +
        '<p class="dish-panel__count" aria-hidden="true"><strong>' + utils.pad(i + 1) + "</strong> / " + total + "</p>" +
        '<h3 class="dish-panel__name">' + esc(dish.name) + "</h3>" +
        (dish.description ? '<p class="dish-panel__desc">' + esc(dish.description) + "</p>" : "") +
        tags +
        footer +
      "</div>"
    );
  };

  /* ------------------------------------------------------------------------ */
  /* Navigation                                                                */
  /* ------------------------------------------------------------------------ */

  /** Rotate to `target` along the shortest arc. */
  DishWheel.prototype.goTo = function (target, opts) {
    var options = opts || {};
    var nextIndex = utils.mod(target, this.count);
    if (nextIndex === this.index) {
      if (options.focusTab) this.tabs[nextIndex].focus();
      return;
    }
    var delta = utils.mod(nextIndex - this.index, this.count);
    if (delta > this.count / 2) delta -= this.count;
    this.turn += delta;
    this.index = nextIndex;
    this.render(options);
  };

  /** Any deliberate user navigation stops autoplay for good (WCAG 2.2.2). */
  DishWheel.prototype.userGoTo = function (target, opts) {
    this.setPlaying(false);
    this.goTo(target, opts);
  };

  DishWheel.prototype.render = function (opts) {
    var options = opts || {};
    var index = this.index;
    var count = this.count;

    this.el.stage.style.setProperty("--rot", (this.turn * this.step) + "deg");

    this.items.forEach(function (item, i) {
      var distance = Math.min(utils.mod(i - index, count), utils.mod(index - i, count));
      item.classList.toggle("is-active", distance === 0);
      item.classList.toggle("is-near", distance === 1);
    });

    this.tabs.forEach(function (tab, i) {
      var selected = i === index;
      tab.setAttribute("aria-selected", String(selected));
      tab.tabIndex = selected ? 0 : -1;
    });

    this.panels.forEach(function (panel, i) {
      panel.classList.toggle("is-active", i === index);
      // The outgoing panel stays visible while it fades out; inert makes it
      // unfocusable and hidden from screen readers immediately.
      panel.inert = i !== index;
    });

    if (this.el.hub) this.el.hub.textContent = utils.pad(index + 1);
    if (options.focusTab) this.tabs[index].focus();
    if (options.announce) this.announce();
  };

  DishWheel.prototype.announce = function () {
    if (!this.el.live) return;
    var dish = this.dishes[this.index];
    var price = utils.formatPrice(dish.price, this.settings);
    this.el.live.textContent =
      dish.name + (price ? ", " + price : "") + ". Dish " + (this.index + 1) + " of " + this.count + ".";
  };

  DishWheel.prototype.bindControls = function () {
    var self = this;
    var el = this.el;

    if (el.prev) el.prev.addEventListener("click", function () {
      self.userGoTo(self.index - 1, { announce: true });
    });
    if (el.next) el.next.addEventListener("click", function () {
      self.userGoTo(self.index + 1, { announce: true });
    });

    // Tabs: click selects; arrow keys move focus + select (automatic activation)
    el.tabs.addEventListener("click", function (event) {
      var tab = event.target.closest('[role="tab"]');
      if (tab) self.userGoTo(Number(tab.getAttribute("data-index")), {});
    });

    el.tabs.addEventListener("keydown", function (event) {
      var target = null;
      switch (event.key) {
        case "ArrowRight": target = self.index + 1; break;
        case "ArrowLeft": target = self.index - 1; break;
        case "Home": target = 0; break;
        case "End": target = self.count - 1; break;
        default: return;
      }
      event.preventDefault();
      self.userGoTo(target, { focusTab: true });
    });

    // Plates: pointer shortcut (keyboard users have the tabs)
    el.track.addEventListener("click", function (event) {
      if (self.suppressClick) return;
      var item = event.target.closest(".dish-wheel__item");
      if (!item) return;
      self.userGoTo(Number(item.getAttribute("data-index")), { announce: true });
    });
  };

  /* ------------------------------------------------------------------------ */
  /* Drag & swipe                                                              */
  /* ------------------------------------------------------------------------ */

  /** Cosine of the focal angle (read from CSS, so breakpoints stay in CSS). */
  DishWheel.prototype.focalCos = function () {
    var focal = parseFloat(getComputedStyle(this.el.stage).getPropertyValue("--focal")) || 0;
    return Math.cos((focal * Math.PI) / 180);
  };

  DishWheel.prototype.bindPointer = function () {
    var self = this;
    var stage = this.el.stage;
    if (this.count < 2 || !window.PointerEvent) return;

    stage.addEventListener("pointerdown", function (event) {
      if (event.pointerType === "mouse" && event.button !== 0) return;
      // One pointer at a time: a second finger (non-primary) or any pointer
      // arriving during an active drag is ignored, so it can never orphan the
      // drag that owns `is-dragging` and the autoplay "drag" hold.
      if (!event.isPrimary || (self.drag && self.drag.active)) return;
      self.drag = {
        id: event.pointerId,
        type: event.pointerType,
        x: event.clientX,
        y: event.clientY,
        active: false,
        deg: 0
      };
    });

    stage.addEventListener("pointermove", function (event) {
      var d = self.drag;
      if (!d || event.pointerId !== d.id) return;
      var dx = event.clientX - d.x;
      var dy = event.clientY - d.y;

      if (!d.active) {
        if (Math.hypot(dx, dy) < DRAG_THRESHOLD) return;
        var horizontal = Math.abs(dx) >= Math.abs(dy);
        d.cos = self.focalCos();
        // Vertical touch gestures belong to page scrolling; vertical mouse drags
        // only rotate when the focal point is on the left/right edge.
        if (!horizontal && (d.type !== "mouse" || Math.abs(d.cos) < 0.5)) {
          self.drag = null;
          return;
        }
        d.axis = horizontal ? "x" : "y";
        d.radius = Math.max(stage.clientWidth * 0.38, 1);
        d.active = true;
        try { stage.setPointerCapture(d.id); } catch (err) { /* not critical */ }
        stage.classList.add("is-dragging");
        self.suspend("drag");
      }

      // Positive degrees = clockwise. Swipe left / drag up (left focal) → next.
      var px = d.axis === "x" ? -dx : dy * d.cos;
      d.deg = (px / d.radius) * (180 / Math.PI);
      stage.style.setProperty("--rot", (self.turn * self.step + d.deg) + "deg");
    });

    function end(event, cancelled) {
      var d = self.drag;
      if (!d || event.pointerId !== d.id) return;
      self.drag = null;
      if (!d.active) return; // plain tap: the click handler takes it

      stage.classList.remove("is-dragging");
      try { stage.releasePointerCapture(d.id); } catch (err) { /* already released */ }
      self.resume("drag");

      // Swallow the click that follows a drag.
      self.suppressClick = true;
      window.setTimeout(function () { self.suppressClick = false; }, 0);

      var steps = cancelled ? 0 : Math.round(d.deg / self.step);
      if (!cancelled && steps === 0 && Math.abs(d.deg) > self.step * FLICK_FRACTION) {
        steps = d.deg > 0 ? 1 : -1;
      }

      if (steps) {
        self.setPlaying(false);
        self.turn += steps;
        self.index = utils.mod(self.turn, self.count);
        self.render({ announce: true });
      } else {
        self.render({}); // snap back
      }
    }

    stage.addEventListener("pointerup", function (event) { end(event, false); });
    stage.addEventListener("pointercancel", function (event) { end(event, true); });
    // Capture lost without a pointerup (element removed, OS gesture, devtools…)
    // (lostpointercapture bubbles: a child losing its implicit touch capture to the
    // stage must not cancel the drag, so only the stage's own loss counts.)
    stage.addEventListener("lostpointercapture", function (event) {
      if (event.target === stage) end(event, true);
    });
    // Window loses focus mid-drag (alt-tab, notification): snap back cleanly.
    window.addEventListener("blur", function () {
      if (self.drag && self.drag.active) end({ pointerId: self.drag.id }, true);
      else self.drag = null;
    });
  };

  /* ------------------------------------------------------------------------ */
  /* Autoplay                                                                  */
  /* ------------------------------------------------------------------------ */
  DishWheel.prototype.bindAutoplay = function () {
    var self = this;
    var root = this.root;
    var play = this.el.play;

    if (!this.autoplayAvailable || !play) {
      if (play) play.hidden = true;
      return;
    }

    play.hidden = false;
    play.addEventListener("click", function () {
      self.setPlaying(!self.playing);
    });

    // Temporary holds
    root.addEventListener("pointerenter", function (e) { if (e.pointerType === "mouse") self.suspend("hover"); });
    root.addEventListener("pointerleave", function (e) { if (e.pointerType === "mouse") self.resume("hover"); });

    document.addEventListener("visibilitychange", function () {
      if (document.hidden) self.suspend("hidden");
      else self.resume("hidden");
    });

    if ("IntersectionObserver" in window) {
      this.suspended.offscreen = true; // the observer reports the real state immediately
      new IntersectionObserver(function (entries) {
        var entry = entries[entries.length - 1];
        // isIntersecting alone is true for a 1px sliver, so enforce the ratio.
        // A stage taller than the viewport (zoom) counts once it fills 60% of it.
        var rootHeight = entry.rootBounds ? entry.rootBounds.height : window.innerHeight;
        var visible = entry.isIntersecting &&
          (entry.intersectionRatio >= VISIBLE_RATIO || entry.intersectionRect.height >= rootHeight * 0.6);
        if (visible) self.resume("offscreen");
        else self.suspend("offscreen");
      }, { threshold: [0, 0.1, 0.2, VISIBLE_RATIO, 0.5, 0.75, 1] }).observe(this.el.stage);
    }

    // Focus rules (WCAG 2.2.2):
    //  - keyboard focus entering the carousel stops rotation;
    //  - keyboard focus moving to any control other than Play stops it;
    //  - focus reaching a dish panel (keyboard or click) always stops it, so a
    //    panel being read is never rotated away or made inert;
    //  - pressing Play is the explicit way to restart, even with focus inside.
    root.addEventListener("focusin", function (event) {
      if (!self.playing) return;
      var target = event.target;
      var fromOutside = !(event.relatedTarget && root.contains(event.relatedTarget));
      var inPanel = self.el.panels.contains(target);
      var keyboard = true;
      try { keyboard = target.matches(":focus-visible"); } catch (err) { /* old browser */ }
      if (target === play && !fromOutside) return;
      if (inPanel || keyboard) self.setPlaying(false);
    });

    utils.onReducedMotionChange(function (reduced) {
      if (reduced) self.setPlaying(false);
    });

    this.setPlaying(this.playing);
  };

  DishWheel.prototype.setPlaying = function (on) {
    var play = this.el.play;
    this.playing = !!on && this.autoplayAvailable;
    this.root.classList.toggle("is-playing", this.playing);
    if (play) {
      play.setAttribute("data-state", this.playing ? "playing" : "paused");
      play.setAttribute("aria-label", this.playing ? "Pause automatic rotation" : "Start automatic rotation");
    }
    this.schedule();
  };

  DishWheel.prototype.suspend = function (reason) {
    if (this.suspended[reason]) return;
    this.suspended[reason] = true;
    this.schedule();
  };

  DishWheel.prototype.resume = function (reason) {
    if (!this.suspended[reason]) return;
    delete this.suspended[reason];
    this.schedule();
  };

  DishWheel.prototype.schedule = function () {
    var self = this;
    window.clearTimeout(this.timer);
    if (this.progress) {
      this.progress.cancel();
      this.progress = null;
    }

    var running = this.playing && !Object.keys(this.suspended).length;
    this.root.classList.toggle("is-autoplaying", running);
    if (!running) return;

    // Restart the progress ring without forcing a synchronous layout.
    var ring = this.el.ring;
    if (ring && typeof ring.animate === "function") {
      this.progress = ring.animate(
        [{ strokeDashoffset: 100 }, { strokeDashoffset: 0 }],
        { duration: this.interval, easing: "linear", fill: "forwards" }
      );
    }

    this.timer = window.setTimeout(function () {
      // Safety net: never rotate away a panel that currently holds focus.
      if (self.el.panels.contains(document.activeElement)) {
        self.setPlaying(false);
        return;
      }
      self.goTo(self.index + 1, {});
      self.schedule();
    }, this.interval);
  };

  /* ------------------------------------------------------------------------ */
  A.wheel = {
    init: function (content) {
      var root = utils.qs("[data-wheel]");
      if (!root) return null;
      var config = content && content.wheel;
      if (!config || !Array.isArray(config.dishes) || !config.dishes.some(function (d) { return d && d.name; })) {
        root.classList.add("is-empty");
        return null;
      }
      return new DishWheel(root, config, content.settings);
    }
  };
})(window.Aurelia = window.Aurelia || {});
