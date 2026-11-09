#!/usr/bin/env node
/**
 * Behaviour tests in headless Chrome/Edge (Node 22+, no npm packages).
 *   node tests/browser.mjs                 all groups
 *   node tests/browser.mjs wheel menu      selected groups
 * Groups: nav header mobile wheel menu gallery form fallback responsive a11y
 */
import { cpSync, mkdtempSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { launch, sleep } from "./lib/cdp.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const only = process.argv.slice(2);
const url = (file, root = ROOT) => { const [f, hash] = file.split("#"); return pathToFileURL(join(root, f)).href + (hash ? "#" + hash : ""); };
const PAGES = ["index", "about", "signature", "menu", "chef", "gallery", "reservations", "contact"];
const results = [];
let b;

function check(name, cond, detail = "") {
  results.push({ name, pass: !!cond, detail });
  console.log(`${cond ? "PASS" : "FAIL"}  ${name}${detail && !cond ? "  — " + detail : ""}`);
}
async function group(name, fn) {
  if (only.length && !only.includes(name)) return;
  console.log(`\n=== ${name}`);
  try { await fn(); } catch (err) { check(`${name}: crashed`, false, err.stack.split("\n").slice(0, 3).join(" ")); }
  await b.media([]);
  await b.send("Emulation.setScriptExecutionDisabled", { value: false });
}
const E = (expr) => b.evaluate(expr);
const logsSince = (n) => b.logs.slice(n);

/** Mutate window.AURELIA_CONTENT as content.js assigns it (before any component runs). */
async function withContent(mutateSrc, fn) {
  const { identifier } = await b.send("Page.addScriptToEvaluateOnNewDocument", {
    source: `(function(){ var c; Object.defineProperty(window, 'AURELIA_CONTENT', { configurable: true,
      get: function () { return c; }, set: function (v) { (${mutateSrc})(v); c = v; } }); })();`
  });
  try { await fn(); } finally { await b.send("Page.removeScriptToEvaluateOnNewDocument", { identifier }); }
}

const wheelState = () => E(`(() => {
  const tabs = [...document.querySelectorAll('[role=tab]')];
  const sel = tabs.findIndex(t => t.getAttribute('aria-selected') === 'true');
  const panel = document.querySelector('.dish-panel.is-active');
  return { sel, tabs: tabs.length, rot: parseFloat(document.querySelector('[data-wheel-stage]').style.getPropertyValue('--rot')) || 0,
    active: [...document.querySelectorAll('.dish-wheel__item')].findIndex(i => i.classList.contains('is-active')),
    hub: document.querySelector('[data-wheel-hub]').textContent, live: document.querySelector('[data-wheel-live]').textContent,
    name: panel && panel.querySelector('.dish-panel__name').textContent, price: panel && (panel.querySelector('.dish-panel__price') || {}).textContent,
    desc: panel && (panel.querySelector('.dish-panel__desc') || {}).textContent, pairing: panel && (panel.querySelector('.dish-panel__pairing') || {}).textContent,
    tags: panel ? [...panel.querySelectorAll('.dish-panel__tags li')].map(l => l.textContent) : [],
    play: (document.querySelector('[data-wheel-play]') || {}).dataset?.state, autoplaying: document.querySelector('[data-wheel]').classList.contains('is-autoplaying'),
    dragging: document.querySelector('[data-wheel-stage]').classList.contains('is-dragging'),
    focus: document.activeElement.id || document.activeElement.tagName,
    inertInactive: [...document.querySelectorAll('.dish-panel:not(.is-active)')].every(p => p.inert) };
})()`);
const toWheel = async () => { await E(`document.querySelector('[data-wheel-stage]').scrollIntoView({block:'center', behavior:'instant'})`); await sleep(700); };

b = await launch();
console.log("Browser:", b.browser);
const content = await (async () => {
  await b.goto(url("index.html"), 1500);
  return E(`JSON.parse(JSON.stringify(window.AURELIA_CONTENT))`);
})();
const STEP = 360 / content.wheel.dishes.length;

/* =========================================================================== nav */
await group("nav", async () => {
  await b.viewport(1440, 900);
  const n0 = b.logs.length;
  for (const page of PAGES) {
    await b.goto(url(page + ".html"), 1600);
    const s = await E(`({ cur: [...document.querySelectorAll('.site-nav [aria-current="page"]')].map(a => a.getAttribute('href')),
      footer: [...document.querySelectorAll('.footer-nav [aria-current="page"]')].map(a => a.getAttribute('href')),
      brand: document.querySelector('.site-header .brand').getAttribute('aria-current'), brandHref: document.querySelector('.site-header .brand').getAttribute('href'),
      cta: document.querySelector('[data-nav-cta]').getAttribute('aria-current'), ctaHref: document.querySelector('[data-nav-cta]').getAttribute('href') })`);
    const file = page + ".html";
    const expectNav = page === "index" || page === "reservations" ? [] : [file];
    check(`nav: ${file} marks current page`, JSON.stringify(s.cur) === JSON.stringify(expectNav) &&
      JSON.stringify(s.footer) === JSON.stringify(page === "reservations" ? [] : [file]) &&
      (page === "index" ? s.brand === "page" : s.brand === null) && (page === "reservations" ? s.cta === "page" : s.cta === null) &&
      s.brandHref === "index.html" && s.ctaHref === "reservations.html", JSON.stringify(s));
  }
  // Real clicks on every desktop nav link lead to the right page
  for (const item of content.nav.filter((i) => !i.mobileOnly)) {
    await b.goto(url("index.html"), 1200);
    await b.clickEl(`.site-nav a[href="${item.href}"]`);
    await sleep(1200);
    const loc = await E(`location.pathname.split('/').pop()`);
    check(`nav: clicking "${item.label}" opens ${item.href}`, loc === item.href, loc);
  }
  await b.goto(url("about.html"), 1200);
  await b.clickEl(".site-header .brand");
  await sleep(1200);
  check("nav: logo returns to the homepage", (await E(`location.pathname.split('/').pop()`)) === "index.html");
  await b.goto(url("index.html"), 1500);
  const ctas = await E(`[...document.querySelectorAll('.hero__actions a')].map(a => a.getAttribute('href'))`);
  check("nav: hero CTAs open reservations.html and menu.html", ctas[0] === "reservations.html" && ctas[1] === "menu.html", ctas.join());
  const contacts = await E(`[...new Set([...document.querySelectorAll('a[href^="tel:"], a[href^="mailto:"]')].map(a => a.getAttribute('href')))]`);
  check("nav: phone/email links use configured details", contacts.includes(content.contact.phoneHref) && contacts.includes(content.contact.emailHref) && contacts.every(h => h === content.contact.phoneHref || h === content.contact.emailHref), contacts.join());
  check("nav: no console errors on any page", logsSince(n0).length === 0, logsSince(n0).join(" | "));
});

/* =========================================================================== header */
await group("header", async () => {
  for (const page of ["index.html", "menu.html"]) {
    await b.viewport(1440, 900);
    await b.goto(url(page), 1800);
    const state = () => E(`(() => { const h = document.querySelector('[data-header]'); const r = h.getBoundingClientRect();
      return { top: Math.round(r.top), bottom: Math.round(r.bottom), cls: h.className, solid: h.classList.contains('is-scrolled') }; })()`);
    let s = await state();
    check(`header(${page}): visible on load`, s.top === 0 && s.bottom > 0, JSON.stringify(s));
    let ok = true;
    for (let y = 0; y <= 2400; y += 100) {
      await E(`window.scrollTo(0, ${y})`); await sleep(40);
      s = await state();
      if (s.top !== 0 || /is-hidden/.test(s.cls)) { ok = false; break; }
    }
    await sleep(400);
    s = await state();
    check(`header(${page}): stays fixed and visible while scrolling down`, ok && s.top === 0 && !/is-hidden/.test(s.cls), JSON.stringify(s));
    check(`header(${page}): solid background once scrolled`, s.solid);
    for (let i = 0; i < 6; i++) { await E(`window.scrollBy(0, -15)`); await sleep(40); }
    await sleep(300);
    s = await state();
    check(`header(${page}): still visible after scrolling up`, s.top === 0, JSON.stringify(s));
    await E(`window.scrollTo(0, 0)`); await sleep(200);
    s = await state();
    check(`header(${page}): transparent and visible at the top`, s.top === 0 && !s.solid, JSON.stringify(s));
  }
  const pad = await E(`getComputedStyle(document.documentElement).scrollPaddingTop`);
  const navH = await E(`document.querySelector('[data-header]').offsetHeight + 'px'`);
  check("header: scroll-padding-top equals header height (anchors not obscured)", pad === navH, `${pad} vs ${navH}`);
  await b.goto(url("menu.html#desserts"), 2000);
  const pos = await E(`({ top: document.getElementById('desserts').getBoundingClientRect().top, header: document.querySelector('[data-header]').getBoundingClientRect().bottom })`);
  check("header: deep link menu.html#desserts lands below the header", pos.top >= pos.header - 2, JSON.stringify(pos));
  const tp = await E(`getComputedStyle(document.querySelector('.site-header')).transitionProperty`);
  check("header: no slide transition (header never moves)", !/transform|all/.test(tp), tp);
});

/* =========================================================================== mobile menu */
await group("mobile", async () => {
  await b.viewport(375, 812, true);
  await b.goto(url("about.html"), 1800);
  const st = () => E(`({ exp: document.querySelector('[data-nav-toggle]').getAttribute('aria-expanded'), menuInert: document.querySelector('[data-mobile-menu]').inert,
    mainInert: document.querySelector('main').inert, footerInert: document.querySelector('footer').inert, locked: document.documentElement.classList.contains('is-scroll-locked'),
    hidden: document.querySelector('[data-header]').classList.contains('is-hidden'), focus: document.activeElement.textContent.trim().slice(0, 20),
    toggleFocused: document.activeElement.hasAttribute('data-nav-toggle') })`);
  for (let y = 0; y <= 1500; y += 100) { await E(`window.scrollTo(0, ${y})`); await sleep(40); }
  await E(`window.scrollBy(0, -60)`); await sleep(200);
  await b.clickEl("[data-nav-toggle]");
  await sleep(700);
  let s = await st();
  check("mobile: menu opens with background inert, scroll locked, focus inside", s.exp === "true" && !s.menuInert && s.mainInert && s.footerInert && s.locked && /Home/.test(s.focus), JSON.stringify(s));
  check("mobile: header visible while menu is open", !s.hidden);
  const cur = await E(`[...document.querySelectorAll('.mobile-menu [aria-current="page"]')].map(a => a.getAttribute('href'))`);
  check("mobile: current page marked in mobile list", cur.length === 1 && cur[0] === "about.html", cur.join());
  for (let i = 0; i < 12; i++) await b.key("Tab");
  const inside = await E(`!!document.activeElement.closest('[data-header],[data-mobile-menu]')`);
  check("mobile: Tab stays inside header + menu", inside);
  await b.key("Escape");
  s = await st();
  check("mobile: Escape closes, unlocks, returns focus to toggle (inert at once)", s.exp === "false" && s.menuInert && !s.mainInert && !s.locked && s.toggleFocused, JSON.stringify(s));
  await b.clickEl("[data-nav-toggle]"); await sleep(600);
  await b.clickEl(".site-header .brand"); await sleep(1300);
  s = await st();
  check("mobile: logo while open navigates home and leaves nothing locked", (await E(`location.pathname.split('/').pop()`)) === "index.html" && !s.locked && !s.mainInert, JSON.stringify(s));
  await b.clickEl("[data-nav-toggle]"); await sleep(1100); // reveal animation is 900ms
  await b.clickEl('.mobile-menu a[href="gallery.html"]'); await sleep(1300);
  check("mobile: menu link opens the page", (await E(`location.pathname.split('/').pop()`)) === "gallery.html");
  await b.viewport(600, 900, true);
  await b.goto(url("menu.html"), 1500);
  await b.clickEl("[data-nav-toggle]"); await sleep(600);
  await b.clickEl(".site-header__cta"); await sleep(1300);
  check("mobile: Reserve in header (≥480px) while open opens reservations, unlocked", (await E(`location.pathname.split('/').pop()`)) === "reservations.html" && !(await E(`document.documentElement.classList.contains('is-scroll-locked')`)));
  await b.media([{ name: "prefers-reduced-motion", value: "reduce" }]);
  await b.goto(url("index.html"), 1200);
  const rm = await E(`({ clip: getComputedStyle(document.querySelector('.mobile-menu')).clipPath, t: getComputedStyle(document.querySelector('.mobile-menu')).transitionProperty })`);
  check("mobile: reduced motion = fade, no clip-path wipe", rm.clip === "none" && !/clip-path/.test(rm.t), JSON.stringify(rm));
});

/* =========================================================================== wheel */
await group("wheel", async () => {
  await b.viewport(1440, 900);
  await b.goto(url("index.html"), 2000);
  await toWheel();
  let s = await wheelState();
  const d0 = content.wheel.dishes[0];
  check("wheel: 7 tabs, first dish selected", s.tabs === 7 && s.sel === 0 && s.active === 0 && s.hub === "01");
  check("wheel: panel shows name, description, price, tags, pairing", s.name === d0.name && s.desc === d0.description && /\$58/.test(s.price) &&
    JSON.stringify(s.tags) === JSON.stringify(d0.tags) && s.pairing.includes(d0.pairing), JSON.stringify(s));
  check("wheel: autoplay running while visible", s.play === "playing" && s.autoplaying);

  await b.clickEl("[data-wheel-next]"); await sleep(150);
  s = await wheelState();
  check("wheel: Next advances, stops autoplay, announces", s.sel === 1 && s.hub === "02" && s.play === "paused" && /Cedar-Cured Salmon, \$42\. Dish 2 of 7\./.test(s.live), JSON.stringify(s));
  await b.clickEl("[data-wheel-prev]"); await b.clickEl("[data-wheel-prev]"); await sleep(150);
  s = await wheelState();
  check("wheel: Previous wraps 1 → 0 → 7 along the shortest arc", s.sel === 6 && Math.abs(s.rot + STEP) < 0.01, JSON.stringify([s.sel, s.rot]));
  await b.clickEl('[role=tab][data-index="3"]'); await sleep(150);
  s = await wheelState();
  // from dish 7 (turn −1) to dish 4: back 3 steps is shorter than forward 4
  check("wheel: tab 4 from dish 7 takes the shorter arc (3 steps back)", s.sel === 3 && Math.abs(s.rot + 4 * STEP) < 0.01, JSON.stringify([s.sel, s.rot]));

  await E(`document.querySelector('[role=tab][aria-selected=true]').focus()`);
  await b.key("ArrowRight"); s = await wheelState(); const r1 = s.sel === 4;
  await b.key("End"); s = await wheelState(); const r2 = s.sel === 6;
  await b.key("ArrowRight"); s = await wheelState(); const r3 = s.sel === 0;
  await b.key("Home"); await b.key("ArrowLeft"); s = await wheelState(); const r4 = s.sel === 6 && s.focus === "signature-wheel-tab-6";
  check("wheel: ArrowRight / End / wrap / Home / ArrowLeft on tabs", r1 && r2 && r3 && r4, JSON.stringify([r1, r2, r3, r4, s.focus]));
  await b.key("Tab");
  s = await wheelState();
  check("wheel: Tab from tablist reaches the active panel; inactive panels inert", s.focus === "signature-wheel-panel-6" && s.inertInactive, s.focus);
  await E(`document.querySelector('[data-wheel-next]').focus()`);
  await b.key("Enter"); await sleep(80); const e1 = (await wheelState()).sel;
  await b.key(" "); await sleep(80); const e2 = (await wheelState()).sel;
  check("wheel: Enter and Space activate the Next button", e1 === 0 && e2 === 1, `${e1} ${e2}`);
  const dom = await E(`!!(document.querySelector('.dish-wheel__controls').compareDocumentPosition(document.querySelector('[data-wheel-panels]')) & 4)`);
  check("wheel: controls precede panels in DOM order", dom);

  // upright photos, even mid-rotation
  await b.clickEl("[data-wheel-next]");
  const angles = [];
  for (let i = 0; i < 4; i++) {
    angles.push(await E(`(() => { const t = new DOMMatrix(getComputedStyle(document.querySelector('.dish-wheel__track')).transform);
      return [...document.querySelectorAll('.dish-wheel__item')].map(it => { const m = t.multiply(new DOMMatrix(getComputedStyle(it).transform)); return Math.abs(Math.atan2(m.b, m.a) * 180 / Math.PI); }); })()`));
    await sleep(220);
  }
  const worst = Math.max(...angles.flat());
  check("wheel: every photo stays upright during rotation", worst < 1, `max tilt ${worst.toFixed(2)}°`);
  const clip = await E(`(() => { const p = getComputedStyle(document.querySelector('.dish-wheel__plate')); return p.overflow + ' ' + p.borderRadius; })()`);
  check("wheel: photos clipped to circles", /hidden/.test(clip) && /50%/.test(clip), clip);

  // rapid repeated input
  await sleep(1300);
  const before = (await wheelState()).sel;
  await E(`for (let i = 0; i < 10; i++) document.querySelector('[data-wheel-next]').click()`);
  await sleep(100);
  s = await wheelState();
  check("wheel: 10 rapid clicks land on the right dish", s.sel === (before + 10) % 7, `${before} → ${s.sel}`);
  await sleep(1300);
  await b.clickEl('.dish-wheel__item[data-index="2"] .dish-wheel__plate'); await sleep(150);
  check("wheel: clicking a plate selects it", (await wheelState()).sel === 2);

  // A — second pointer during a drag
  await b.goto(url("index.html"), 1800); await toWheel();
  const a = await E(`(() => { const s = document.querySelector('[data-wheel-stage]'); const r = s.getBoundingClientRect(); const x = r.x + r.width / 2, y = r.y + r.height / 2;
    const ev = (t, id, dx, primary) => s.dispatchEvent(new PointerEvent(t, { bubbles: true, pointerId: id, pointerType: 'touch', isPrimary: primary, clientX: x + dx, clientY: y, button: 0 }));
    ev('pointerdown', 1, 0, true); ev('pointermove', 1, -40, true); ev('pointermove', 1, -80, true);
    ev('pointerdown', 2, 40, false); ev('pointermove', 2, 90, false); ev('pointerup', 1, -80, true); ev('pointerup', 2, 90, false);
    return s.classList.contains('is-dragging'); })()`);
  await sleep(200);
  s = await wheelState();
  check("wheel A: second pointer cannot strand a drag (no stuck is-dragging, rotation snapped)", !a && !s.dragging && Math.abs(s.rot / STEP - Math.round(s.rot / STEP)) < 0.001, JSON.stringify([a, s.dragging, s.rot]));
  await E(`document.querySelector('[data-wheel-play]').click()`); await sleep(6600);
  check("wheel A: autoplay not left suspended after the multi-pointer drag", (await wheelState()).autoplaying || (await wheelState()).sel !== s.sel);
  const c2 = await E(`(() => { const s = document.querySelector('[data-wheel-stage]'); const r = s.getBoundingClientRect(); const x = r.x + r.width / 2, y = r.y + r.height / 2;
    const ev = (t, dx) => s.dispatchEvent(new PointerEvent(t, { bubbles: true, pointerId: 7, pointerType: 'mouse', isPrimary: true, clientX: x + dx, clientY: y, button: 0, buttons: 1 }));
    ev('pointerdown', 0); ev('pointermove', -60); const mid = s.classList.contains('is-dragging'); ev('pointercancel', -60); return [mid, s.classList.contains('is-dragging')]; })()`);
  check("wheel A: pointercancel cleans up the drag", c2[0] === true && c2[1] === false, JSON.stringify(c2));

  // B — focused panel is never rotated away
  await b.goto(url("index.html"), 1800); await toWheel();
  await E(`document.querySelector('[data-wheel-next]').click()`);
  await E(`document.querySelector('[data-wheel-play]').click()`);
  const playing = (await wheelState()).play;
  await E(`document.querySelector('.dish-panel.is-active').focus()`);
  await sleep(6600);
  s = await wheelState();
  check("wheel B: Play restarts; focusing the panel stops autoplay, panel keeps focus", playing === "playing" && s.play === "paused" && s.focus === "signature-wheel-panel-1" && s.sel === 1, JSON.stringify([playing, s.play, s.focus, s.sel]));
  await E(`document.querySelector('[data-wheel-play]').focus()`);
  await b.key("Enter"); await sleep(100);
  check("wheel B: keyboard Play still starts playback with focus inside", (await wheelState()).play === "playing");
  await b.key("Tab"); await sleep(100);
  check("wheel B: moving keyboard focus to another control stops it", (await wheelState()).play === "paused");

  // C — visibility threshold
  await b.goto(url("index.html"), 1800);
  await E(`document.querySelector('[data-wheel-stage]').scrollIntoView({block:'center', behavior:'instant'})`); await sleep(700);
  const full = (await wheelState()).autoplaying;
  await E(`(() => { const r = document.querySelector('[data-wheel-stage]').getBoundingClientRect(); window.scrollBy(0, r.bottom - r.height * 0.1); })()`); await sleep(700);
  const tenth = (await wheelState()).autoplaying;
  await E(`(() => { const r = document.querySelector('[data-wheel-stage]').getBoundingClientRect(); window.scrollBy(0, r.top - innerHeight + r.height * 0.6); })()`); await sleep(700);
  const sixty = (await wheelState()).autoplaying;
  check("wheel C: autoplay only while ≥35% of the stage is visible", full && !tenth && sixty, JSON.stringify([full, tenth, sixty]));

  // D — malformed price settings
  for (const [label, settings] of [["priceDecimals:-1", { priceDecimals: -1 }], ["currency:NOPE!", { currency: "NOPE!" }], ["locale:???", { locale: "???" }]]) {
    await withContent(`function (v) { Object.assign(v.settings, ${JSON.stringify(settings)}); }`, async () => {
      const n0 = b.logs.length;
      await b.goto(url("index.html"), 1800);
      const r = await E(`({ ready: document.querySelector('[data-wheel]').classList.contains('is-ready'), price: document.querySelector('.dish-panel.is-active .dish-panel__price').textContent })`);
      const errors = logsSince(n0).filter((l) => !/warning/.test(l));
      check(`wheel D: ${label} → wheel still works, price shown`, r.ready && /58/.test(r.price) && errors.length === 0, JSON.stringify(r) + errors.join(" "));
    });
  }

  // Reduced motion at load and when changed
  await b.media([{ name: "prefers-reduced-motion", value: "reduce" }]);
  await b.goto(url("index.html"), 1800); await toWheel();
  s = await wheelState();
  const dur = await E(`getComputedStyle(document.querySelector('.dish-wheel__track')).transitionDuration`);
  check("wheel: reduced motion at load → no autoplay, rotation snaps", s.play === "paused" && !s.autoplaying && parseFloat(dur) <= 0.01, `${s.play} ${dur}`);
  await b.media([]);
  await b.goto(url("index.html"), 1800); await toWheel();
  const was = (await wheelState()).play;
  await b.media([{ name: "prefers-reduced-motion", value: "reduce" }]); await sleep(300);
  check("wheel: switching to reduced motion while playing stops autoplay", was === "playing" && (await wheelState()).play === "paused");
  await b.media([]);

  // Mobile: horizontal swipe vs vertical scroll
  await b.viewport(390, 844, true);
  await b.goto(url("index.html"), 1800); await toWheel();
  const box = await E(`(() => { const r = document.querySelector('[data-wheel-stage]').getBoundingClientRect(); return { x: r.x + r.width * 0.7, y: r.y + r.height * 0.5 }; })()`);
  const sel0 = (await wheelState()).sel;
  await b.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: box.x, y: box.y }] });
  for (let i = 1; i <= 8; i++) { await b.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: box.x - i * 11, y: box.y }] }); await sleep(16); }
  await b.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] }); await sleep(200);
  check("wheel: horizontal swipe left → next dish", (await wheelState()).sel === (sel0 + 1) % 7);
  await sleep(1300);
  // A vertical touch drag over the wheel must not rotate it (page scrolling is
  // delegated to the browser via touch-action: pan-y; headless Chrome cannot
  // perform real touch scrolling, so that part is verified by the CSS value).
  const sel1 = (await wheelState()).sel;
  await b.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: box.x, y: box.y }] });
  for (let i = 1; i <= 8; i++) { await b.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: box.x + 2, y: box.y - i * 14 }] }); await sleep(16); }
  await b.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] }); await sleep(200);
  const ta = await E(`getComputedStyle(document.querySelector('[data-wheel-stage]')).touchAction`);
  s = await wheelState();
  check("wheel: vertical touch drag does not rotate the wheel; stage allows vertical page panning", s.sel === sel1 && !s.dragging && ta === "pan-y", JSON.stringify([sel1, s.sel, ta]));

  // Dish counts
  await b.viewport(1280, 900);
  for (const n of [1, 2, 3, 5, 12]) {
    await withContent(`function (v) { var d = v.wheel.dishes; while (d.length < ${n}) d.push(Object.assign({}, d[d.length % 7], { name: d[d.length % 7].name + ' ' + d.length })); v.wheel.dishes = d.slice(0, ${n}); }`, async () => {
      const n0 = b.logs.length;
      await b.goto(url("index.html"), 1800); await toWheel();
      const r = await E(`(() => { const plates = [...document.querySelectorAll('.dish-wheel__item')].map(i => i.querySelector('.dish-wheel__plate').getBoundingClientRect());
        let overlap = 0; for (let i = 0; i < plates.length; i++) for (let j = i + 1; j < plates.length; j++) { const a = plates[i], c = plates[j];
          const d = Math.hypot((a.x + a.width/2) - (c.x + c.width/2), (a.y + a.height/2) - (c.y + c.height/2)); if (d < (a.width + c.width) / 2 - 2) overlap++; }
        const w = document.querySelector('[data-wheel]'); return { ready: w.classList.contains('is-ready'), single: w.classList.contains('is-single'), tabs: document.querySelectorAll('[role=tab]').length,
          controls: getComputedStyle(document.querySelector('.dish-wheel__controls')).display, overlap }; })()`);
      const okCount = r.ready && r.tabs === n && r.overlap === 0 && (n === 1 ? r.single && r.controls === "none" : !r.single);
      check(`wheel: ${n} dish${n > 1 ? "es" : ""} → ready, ${n} tabs, no overlapping plates${n === 1 ? ", controls hidden" : ""}`, okCount && logsSince(n0).length === 0, JSON.stringify(r) + logsSince(n0).join(" "));
    });
  }
});

/* =========================================================================== menu */
await group("menu", async () => {
  await b.viewport(1280, 900);
  await b.goto(url("menu.html"), 1800);
  const st = () => E(`({ pressed: [...document.querySelectorAll('[data-filter]')].filter(f => f.getAttribute('aria-pressed') === 'true').map(f => f.dataset.filter),
    visible: [...document.querySelectorAll('[data-menu-category]')].filter(s => !s.hidden).map(s => s.id), hash: location.hash, live: document.querySelector('[data-menu-live]').textContent,
    buttons: document.querySelectorAll('button[data-filter]').length })`);
  let s = await st();
  const cats = content.menu.categories.map((c) => c.id);
  check("menu: filters are buttons; All pressed; every category visible", s.buttons === cats.length + 1 && s.pressed[0] === "all" && s.visible.length === cats.length, JSON.stringify(s));
  await b.clickEl('[data-filter="desserts"]'); await sleep(200);
  s = await st();
  const dCount = content.menu.categories.find((c) => c.id === "desserts").items.length;
  check("menu: Desserts shows only desserts, updates hash and announces", JSON.stringify(s.visible) === '["desserts"]' && s.pressed[0] === "desserts" && s.hash === "#desserts" && s.live === `Showing Desserts: ${dCount} items.`, JSON.stringify(s));
  await E(`document.querySelector('[data-filter="all"]').focus()`); await b.key("Enter"); await sleep(150);
  s = await st();
  check("menu: keyboard Enter on All restores everything, clears hash", s.visible.length === cats.length && s.hash === "", JSON.stringify(s));
  await E(`document.querySelector('[data-filter="mains"]').focus()`); await b.key(" "); await sleep(150);
  check("menu: Space activates a filter", JSON.stringify((await st()).visible) === '["mains"]');
  await b.goto(url("menu.html#drinks"), 1800);
  s = await st();
  check("menu: deep link menu.html#drinks applies the Drinks filter", JSON.stringify(s.visible) === '["drinks"]' && s.pressed[0] === "drinks", JSON.stringify(s));
  const prices = await E(`[...document.querySelectorAll('.menu-item__price')].map(p => p.textContent.replace('Price: ', ''))`);
  check("menu: prices formatted (numbers → $, strings verbatim)", prices.includes("$58") && prices.includes("Market price") && prices.includes("From $14"), prices.slice(0, 6).join());
});

/* =========================================================================== gallery */
await group("gallery", async () => {
  await b.viewport(1280, 900);
  await b.goto(url("gallery.html"), 2000);
  const total = content.gallery.items.length;
  const btns = await E(`document.querySelectorAll('button.gallery__thumb').length`);
  check(`gallery: ${total} thumbnails are buttons with names`, btns === total && (await E(`[...document.querySelectorAll('button.gallery__thumb')].every(b => /^View photo \\d+ of/.test(b.getAttribute('aria-label')))`)));
  await b.clickEl('[data-gallery-index="2"]'); await sleep(600);
  const lb = () => E(`({ open: document.querySelector('[data-lightbox]').open, count: document.querySelector('[data-lightbox-count]').textContent, alt: document.querySelector('[data-lightbox-img]').alt,
    caption: document.querySelector('[data-lightbox-caption]').textContent, focus: document.activeElement.getAttribute('aria-label') || document.activeElement.className,
    locked: document.documentElement.classList.contains('is-lightbox-open'), loaded: document.querySelector('[data-lightbox-img]').complete && document.querySelector('[data-lightbox-img]').naturalWidth > 0 })`);
  let s = await lb();
  check("gallery: thumbnail opens lightbox (modal), focus on Close, alt + caption from content", s.open && s.count === `3 / ${total}` && s.alt === content.gallery.items[2].alt && s.caption === content.gallery.items[2].caption && s.focus === "Close photo viewer" && s.locked, JSON.stringify(s));
  await sleep(1200);
  check("gallery: full-size photo loads", (await lb()).loaded);
  await b.key("ArrowRight"); s = await lb(); const k1 = s.count === `4 / ${total}`;
  await b.key("End"); s = await lb(); const k2 = s.count === `${total} / ${total}`;
  await b.key("ArrowRight"); s = await lb(); const k3 = s.count === `1 / ${total}`;
  await b.clickEl("[data-lightbox-prev]"); s = await lb(); const k4 = s.count === `${total} / ${total}`;
  check("gallery: ←/→, End, wraparound and Previous button", k1 && k2 && k3 && k4, JSON.stringify([k1, k2, k3, k4]));
  const live = await E(`document.querySelector('[data-lightbox-live]').textContent`);
  check("gallery: photo changes are announced", new RegExp(`Photo ${total} of ${total}`).test(live), live);
  let escaped = false;
  for (let i = 0; i < 8; i++) { await b.key("Tab"); if (!(await E(`!document.activeElement || document.activeElement === document.body || !!document.activeElement.closest('dialog')`))) escaped = true; }
  check("gallery: keyboard focus never leaves the lightbox", !escaped);
  await b.key("Escape"); await sleep(300);
  s = await lb();
  const fBack = await E(`document.activeElement.getAttribute('data-gallery-index')`);
  check("gallery: Escape closes, unlocks scroll, focus returns to the same thumbnail", !s.open && !s.locked && fBack === "2", JSON.stringify([s.open, s.locked, fBack]));
  await b.clickEl('[data-gallery-index="0"]'); await sleep(500);
  await b.clickEl("[data-lightbox-close]"); await sleep(300);
  check("gallery: Close button closes and restores focus", !(await lb()).open && (await E(`document.activeElement.getAttribute('data-gallery-index')`)) === "0");
  await b.viewport(375, 812, true);
  await b.goto(url("gallery.html"), 1800);
  await b.clickEl('[data-gallery-index="1"]'); await sleep(700);
  const fit = await E(`(() => { const i = document.querySelector('[data-lightbox-img]').getBoundingClientRect(); const btns = [...document.querySelectorAll('.lightbox__btn')].map(b => b.getBoundingClientRect());
    return i.right <= innerWidth + 1 && i.bottom <= innerHeight + 1 && btns.every(r => r.right <= innerWidth && r.bottom <= innerHeight && r.width >= 44); })()`);
  check("gallery: lightbox fits a 375px screen; controls ≥44px and on screen", fit);
});

/* =========================================================================== form */
await group("form", async () => {
  await b.viewport(1280, 900);
  const fill = async (o) => E(`(() => { const f = document.querySelector('[data-reservation-form]'); const v = ${JSON.stringify(o)};
    for (const k in v) { f.elements[k].value = v[k]; f.elements[k].dispatchEvent(new Event('input', { bubbles: true })); f.elements[k].dispatchEvent(new Event('change', { bubbles: true })); } })()`);
  const next = (dow) => E(`(() => { const d = new Date(); d.setDate(d.getDate() + 1); while (d.getDay() !== ${dow}) d.setDate(d.getDate() + 1);
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); })()`);
  const valid = async () => ({ name: "Alex Sample", email: "alex@example.com", phone: "+1 555 010 2030", date: await next(4), time: "19:00", guests: "2" });
  const st = () => E(`({ notice: !document.querySelector('[data-reservation-notice]').hidden, fallback: getComputedStyle(document.querySelector('.reservation-fallback')).display,
    summary: !document.querySelector('[data-form-errors]').hidden, summaryFocused: document.activeElement === document.querySelector('[data-form-errors]'),
    errors: [...document.querySelectorAll('[data-form-errors] li')].map(l => l.textContent), invalid: [...document.querySelectorAll('[aria-invalid=true]')].map(e => e.name),
    status: document.querySelector('[data-form-status]').textContent, mailto: (document.querySelector('[data-form-status] a[href^="mailto:"]') || {}).href || '',
    success: !document.querySelector('[data-reservation-success]').hidden, formHidden: document.querySelector('[data-reservation-form]').hidden,
    disabled: document.querySelector('[data-reservation-form] [type=submit]').disabled })`);
  await b.goto(url("reservations.html"), 1800);
  let s = await st();
  check("form: endpoint not configured → notice shown up front; no-JS fallback hidden", s.notice && s.fallback === "none", JSON.stringify(s));
  await b.clickEl("[data-reservation-form] [type=submit]"); await sleep(200);
  s = await st();
  check("form: empty submit → focused error summary, 6 errors, fields aria-invalid", s.summary && s.summaryFocused && s.errors.length === 6 && s.invalid.length === 6, JSON.stringify(s));
  const links = await E(`[...document.querySelectorAll('[data-form-errors] a')].every(a => document.querySelector(a.getAttribute('href')))`);
  const described = await E(`(() => { const i = document.getElementById('res-name'); return i.getAttribute('aria-describedby').split(' ').map(id => document.getElementById(id).textContent).join(' '); })()`);
  check("form: summary links point at fields; inline error is the field's description", links && /full name/i.test(described), described);
  await fill(Object.assign(await valid(), { date: await next(1) })); await b.clickEl("[data-reservation-form] [type=submit]"); await sleep(150);
  check("form: closed weekday rejected with a clear message", (await st()).errors.some((e) => /closed on Mondays/.test(e)));
  await fill({ date: await E(`(() => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); })()`) });
  await b.clickEl("[data-reservation-form] [type=submit]"); await sleep(150);
  check("form: same-day request redirected to phone", (await st()).errors.some((e) => /please call/.test(e)));
  await fill(Object.assign(await valid(), { guests: "more" })); await b.clickEl("[data-reservation-form] [type=submit]"); await sleep(150);
  check("form: party larger than the maximum redirected to phone", (await st()).errors.some((e) => /more than 8/.test(e)));
  await fill(Object.assign(await valid(), { email: "nope@", phone: "12" })); await b.clickEl("[data-reservation-form] [type=submit]"); await sleep(150);
  s = await st();
  check("form: email and phone format errors", s.errors.some((e) => /name@example\.com/.test(e)) && s.errors.some((e) => /7 to 15 digits/.test(e)), s.errors.join(" | "));

  const posts = [];
  await b.send("Network.enable");
  b.on("Network.requestWillBeSent", (p) => { if (p.request.method === "POST") posts.push(p.request.url); });
  await fill(await valid()); await b.clickEl("[data-reservation-form] [type=submit]"); await sleep(300);
  s = await st();
  check("form: valid + no endpoint → explains it can't send, offers phone/email + prefilled email; no success, nothing sent",
    !s.summary && /can't send your request/.test(s.status) && /mailto:reservations@aurelia\.example\?subject=Reservation%20inquiry/.test(s.mailto) && !s.success && posts.length === 0, JSON.stringify(s));

  // Configured endpoint, intercepted
  const ENDPOINT = "https://forms.example.test/inquiry";
  await b.send("Fetch.enable", { patterns: [{ urlPattern: "https://forms.example.test/*" }] });
  let reply = 200;
  b.on("Fetch.requestPaused", (p) => b.send("Fetch.fulfillRequest", { requestId: p.requestId, responseCode: reply,
    responseHeaders: [{ name: "Access-Control-Allow-Origin", value: "*" }, { name: "Content-Type", value: "application/json" }], body: Buffer.from(reply === 200 ? '{"ok":true}' : '{"error":"x"}').toString("base64") }));
  await withContent(`function (v) { v.reservation.endpoint = ${JSON.stringify(ENDPOINT)}; }`, async () => {
    await b.goto(url("reservations.html"), 1800);
    check("form: endpoint configured → 'switched off' notice hidden", !(await st()).notice);
    reply = 500;
    await fill(await valid()); await b.clickEl("[data-reservation-form] [type=submit]"); await sleep(800);
    s = await st();
    check("form: server error → honest failure message, form kept, button re-enabled", /could not be sent\. Nothing was booked/.test(s.status) && !s.success && !s.formHidden && !s.disabled, JSON.stringify(s));
    reply = 200;
    await b.clickEl("[data-reservation-form] [type=submit]"); await sleep(800);
    s = await st();
    const msg = await E(`document.querySelector('[data-success-message]').textContent + ' | ' + document.activeElement.hasAttribute('data-reservation-success')`);
    check("form: 2xx → success panel says inquiry sent, NOT a confirmation; focus moved to it", s.success && s.formHidden && /not a confirmation/.test(msg) && /true$/.test(msg), msg);
    check("form: POST went to the configured endpoint", posts.filter((u) => u === ENDPOINT).length === 2, posts.join());
  });
  await withContent(`function (v) { v.reservation.endpoint = "http://evil.example/collect"; }`, async () => {
    await b.goto(url("reservations.html"), 1800);
    check("form: non-https endpoint refused (treated as not configured)", (await st()).notice);
  });
  await b.send("Fetch.disable");
  b.off("Fetch.requestPaused"); b.off("Network.requestWillBeSent");
});

/* =========================================================================== fallbacks */
await group("fallback", async () => {
  await b.viewport(1280, 900);
  const tmp = mkdtempSync(join(tmpdir(), "aurelia-variants-"));
  const variant = (name, edit) => {
    const dir = join(tmp, name);
    cpSync(ROOT, dir, { recursive: true, filter: (src) => !/[\\/](\.git|tests|release|node_modules)([\\/]|$)/.test(src.slice(ROOT.length)) });
    edit(dir);
    return dir;
  };
  const patch = (dir, file, from, to) => {
    const p = join(dir, file);
    writeFileSync(p, readFileSync(p, "utf8").split(from).join(to));
  };
  const broken = variant("broken-content", (d) => writeFileSync(join(d, "assets/js/content.js"), readFileSync(join(d, "assets/js/content.js"), "utf8") + "\n oops,, }"));
  const noWheel = variant("no-wheel", (d) => { patch(d, "index.html", "components/wheel.js", "components/missing.js"); });
  const noNav = variant("no-nav", (d) => { for (const p of PAGES) patch(d, p + ".html", "components/nav.js", "components/missing.js"); });
  const noGallery = variant("no-gallery", (d) => patch(d, "gallery.html", "components/gallery.js", "components/missing.js"));

  await b.goto(url("menu.html", broken), 3600);
  let s = await E(`({ items: document.querySelectorAll('.menu-item').length, filters: document.querySelectorAll('[data-filter]').length, title: document.title })`);
  check("fallback: broken content.js → menu still complete from baked HTML, no dead filter buttons", s.items > 15 && s.filters === 0 && /Menu/.test(s.title), JSON.stringify(s));
  await b.goto(url("index.html", broken), 3600);
  s = await E(`({ fb: getComputedStyle(document.querySelector('[data-wheel-fallback]')).display, stage: getComputedStyle(document.querySelector('[data-wheel-stage]')).display, h1: document.querySelector('h1').textContent.trim().length, nav: document.querySelectorAll('.site-nav a').length })`);
  check("fallback: broken content.js → wheel message + menu link; hero & nav intact", s.fb === "block" && s.stage === "none" && s.h1 > 10 && s.nav === 6, JSON.stringify(s));
  await b.goto(url("reservations.html", broken), 3600);
  s = await E(`({ form: getComputedStyle(document.querySelector('.res-form')).display, fb: getComputedStyle(document.querySelector('.reservation-fallback')).display })`);
  check("fallback: broken content.js → reservation form replaced by phone/email message", s.form === "none" && s.fb === "grid", JSON.stringify(s));
  await b.goto(url("gallery.html", broken), 3600);
  s = await E(`({ figs: document.querySelectorAll('figure.gallery__thumb').length, btns: document.querySelectorAll('button.gallery__thumb').length })`);
  check("fallback: broken content.js → gallery shows plain photos, no dead buttons", s.figs > 0 && s.btns === 0, JSON.stringify(s));

  await b.goto(url("index.html", noWheel), 3600);
  s = await E(`({ fb: getComputedStyle(document.querySelector('[data-wheel-fallback]')).display, btns: [...document.querySelectorAll('.dish-wheel button')].filter(b => b.offsetParent).length })`);
  check("fallback: wheel.js missing → message, no dead wheel buttons", s.fb === "block" && s.btns === 0, JSON.stringify(s));
  await b.viewport(375, 812, true);
  await b.goto(url("about.html", noNav), 3600);
  s = await E(`({ toggle: getComputedStyle(document.querySelector('[data-nav-toggle]')).display, nav: getComputedStyle(document.querySelector('.site-nav')).display, sw: document.documentElement.scrollWidth })`);
  check("fallback: nav.js missing → no dead hamburger, inline links instead", s.toggle === "none" && s.nav === "block" && s.sw <= 375, JSON.stringify(s));
  await b.viewport(1280, 900);
  await b.goto(url("gallery.html", noGallery), 3600);
  s = await E(`({ figs: document.querySelectorAll('figure.gallery__thumb').length, btns: document.querySelectorAll('button.gallery__thumb').length })`);
  check("fallback: gallery.js missing → plain photos, no dead buttons", s.figs > 0 && s.btns === 0, JSON.stringify(s));

  // JavaScript disabled entirely
  await b.send("Emulation.setScriptExecutionDisabled", { value: true });
  await b.goto(url("menu.html"), 1500);
  s = await E(`({ items: document.querySelectorAll('.menu-item').length, filters: document.querySelectorAll('[data-filter]').length })`).catch(() => null);
  await b.send("Emulation.setScriptExecutionDisabled", { value: false });
  // evaluate is itself JS; re-read via DOM snapshot instead when disabled
  const snap = await b.send("DOMSnapshot.captureSnapshot", { computedStyles: [] }).catch(() => null);
  const strings = snap ? snap.strings : [];
  check("fallback: JavaScript disabled → full menu in the HTML", strings.filter((x) => x === "menu-item").length > 15 || (s && s.items > 15));

  // Failed image → plate shows monogram, page keeps working
  await b.send("Fetch.enable", { patterns: [{ urlPattern: "*photo-1519708227418*" }] });
  b.on("Fetch.requestPaused", (p) => b.send("Fetch.failRequest", { requestId: p.requestId, errorReason: "Failed" }));
  await b.goto(url("index.html"), 2200); await toWheel(); await sleep(800);
  s = await E(`({ err: document.querySelector('.dish-wheel__item[data-index="1"] .dish-wheel__plate').classList.contains('is-error'), ready: document.querySelector('[data-wheel]').classList.contains('is-ready') })`);
  check("fallback: failed dish photo → monogram placeholder, wheel still works", s.err && s.ready, JSON.stringify(s));
  await b.send("Fetch.disable"); b.off("Fetch.requestPaused");
  rmSync(tmp, { recursive: true, force: true });
});

/* =========================================================================== responsive */
await group("responsive", async () => {
  const sizes = [[320, 640, true], [375, 812, true], [768, 1024, true], [1024, 768, false], [1440, 900, false], [812, 375, true]];
  for (const [w, h, mobile] of sizes) {
    await b.viewport(w, h, mobile);
    const bad = [];
    for (const page of PAGES) {
      await b.goto(url(page + ".html"), 1300);
      const r = await E(`(() => { const sw = document.documentElement.scrollWidth;
        const hdr = [...document.querySelectorAll('.site-header .brand, .site-header__cta, .nav-toggle, .site-nav')].filter(e => e.offsetParent).map(e => e.getBoundingClientRect());
        const off = hdr.some(r => r.right > innerWidth + 1 || r.left < -1);
        let overlap = false; for (let i = 0; i < hdr.length; i++) for (let j = i + 1; j < hdr.length; j++) { const a = hdr[i], c = hdr[j]; if (a.left < c.right - 1 && c.left < a.right - 1 && a.top < c.bottom && c.top < a.bottom) overlap = true; }
        return { sw, off, overlap }; })()`);
      if (r.sw > w || r.off || r.overlap) bad.push(`${page}:${JSON.stringify(r)}`);
    }
    check(`responsive ${w}×${h}: all 8 pages — no horizontal overflow, header fits without overlap`, bad.length === 0, bad.join(" "));
  }
  // Enlarged text (root font size ≈ the browser's text-size setting)
  for (const [w, h, pct] of [[640, 900, 200], [375, 812, 150]]) {
    await b.viewport(w, h, true);
    const bad = [];
    for (const page of PAGES) {
      await b.goto(url(page + ".html"), 1300);
      const r = await E(`(() => { document.documentElement.style.fontSize = '${pct}%'; return new Promise(res => requestAnimationFrame(() => {
        const t = document.querySelector('[data-nav-toggle]').getBoundingClientRect();
        res({ sw: document.documentElement.scrollWidth, toggle: t.right <= innerWidth && t.left >= 0 }); })); })()`);
      if (r.sw > w || !r.toggle) bad.push(`${page}:${JSON.stringify(r)}`);
    }
    check(`responsive: ${pct}% text at ${w}px — no horizontal overflow, menu toggle reachable`, bad.length === 0, bad.join(" "));
  }
});

/* =========================================================================== a11y */
await group("a11y", async () => {
  await b.viewport(1280, 900);
  for (const page of PAGES) {
    await b.goto(url(page + ".html"), 1600);
    const r = await E(`(() => {
      const visible = (e) => !!(e.offsetWidth || e.offsetHeight || e.getClientRects().length) && getComputedStyle(e).visibility !== 'hidden';
      const name = (e) => (e.getAttribute('aria-label') || '').trim() || (e.getAttribute('aria-labelledby') || '').split(' ').map(id => (document.getElementById(id) || {}).textContent || '').join('').trim()
        || e.textContent.trim() || [...e.querySelectorAll('img[alt]')].map(i => i.alt).join('').trim();
      const ctrls = [...document.querySelectorAll('a[href], button, input, select, textarea')].filter(e => !e.closest('[inert]') && visible(e));
      const unnamed = ctrls.filter(e => { if (/INPUT|SELECT|TEXTAREA/.test(e.tagName)) return !(e.labels && e.labels.length) && !e.getAttribute('aria-label'); return !name(e); }).map(e => e.outerHTML.slice(0, 80));
      const focusableHidden = [...document.querySelectorAll('[aria-hidden="true"] a[href], [aria-hidden="true"] button, [aria-hidden="true"] input:not([tabindex="-1"])')].filter(e => !e.closest('[inert]')).map(e => e.outerHTML.slice(0, 60));
      const small = ctrls.filter(e => !e.closest('p, li, dd, address') && !e.classList.contains('skip-link')).filter(e => { const r = e.getBoundingClientRect(); return r.width < 24 || r.height < 24; }).map(e => e.outerHTML.slice(0, 60));
      const imgs = [...document.images].filter(i => !i.hasAttribute('alt')).length;
      const heads = [...document.querySelectorAll('h1,h2,h3,h4')].filter(h => !h.closest('[hidden]')).map(h => +h.tagName[1]);
      let jump = false; for (let i = 1; i < heads.length; i++) if (heads[i] > heads[i - 1] + 1) jump = true;
      return { unnamed, focusableHidden, small, imgs, h1: heads.filter(h => h === 1).length, jump, landmarks: !!document.querySelector('header') && !!document.querySelector('main#main') && !!document.querySelector('footer') && !!document.querySelector('nav[aria-label]') };
    })()`);
    check(`a11y ${page}: every visible control has an accessible name`, r.unnamed.length === 0, r.unnamed.join(" | "));
    check(`a11y ${page}: nothing focusable inside aria-hidden`, r.focusableHidden.length === 0, r.focusableHidden.join(" | "));
    check(`a11y ${page}: one h1, no skipped heading levels, landmarks present`, r.h1 === 1 && !r.jump && r.landmarks, JSON.stringify({ h1: r.h1, jump: r.jump, lm: r.landmarks }));
    check(`a11y ${page}: standalone targets ≥24×24px`, r.small.length === 0, r.small.join(" | "));
  }
  // focus ring visible on keyboard focus
  await b.goto(url("index.html"), 1500);
  await b.key("Tab");
  const ring = await E(`(() => { const s = getComputedStyle(document.activeElement); return { el: document.activeElement.className, outline: s.outlineStyle + ' ' + s.outlineWidth }; })()`);
  check("a11y: first Tab reaches the skip link with a visible focus ring", /skip-link/.test(ring.el), JSON.stringify(ring));
  await b.key("Tab");
  const ring2 = await E(`getComputedStyle(document.activeElement).outlineStyle + ' ' + getComputedStyle(document.activeElement).outlineWidth`);
  check("a11y: keyboard focus ring on header links", /solid 2px/.test(ring2), ring2);
});

await b.close();
const failed = results.filter((r) => !r.pass);
console.log(`\n${results.length - failed.length} passed, ${failed.length} failed  (${b.browser})`);
process.exit(failed.length ? 1 : 0);
