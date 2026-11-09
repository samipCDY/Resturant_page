#!/usr/bin/env node
/**
 * Static checks — no browser needed (Node 18+).
 *   node tests/static-checks.mjs
 *
 * JS syntax · CSS sanity · local assets · internal links & #anchors ·
 * duplicate IDs · ARIA id references · dead links · prerender sync ·
 * helper edge cases (prices, URLs, endpoints).
 */
import { readFileSync, readdirSync, existsSync, statSync } from "node:fs";
import { join, dirname, resolve, extname } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import vm from "node:vm";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
let failures = 0;
let passes = 0;
const ok = (name, cond, detail = "") => {
  if (cond) passes++;
  else failures++;
  console.log(`${cond ? "PASS" : "FAIL"}  ${name}${detail ? "  — " + detail : ""}`);
};

const walk = (dir) => readdirSync(dir).flatMap((f) => {
  const p = join(dir, f);
  if (/^(\.git|node_modules|release|tests)$/.test(f)) return [];
  return statSync(p).isDirectory() ? walk(p) : [p];
});
const files = walk(ROOT);
const rel = (p) => p.slice(ROOT.length + 1).replace(/\\/g, "/");
const htmlFiles = files.filter((f) => f.endsWith(".html"));
const pages = Object.fromEntries(htmlFiles.map((f) => [rel(f), readFileSync(f, "utf8")]));

/* ---- JavaScript syntax --------------------------------------------------------- */
for (const f of files.filter((f) => /\.(m?js)$/.test(f))) {
  try {
    execFileSync(process.execPath, ["--check", f], { stdio: "pipe" });
    ok(`JS syntax ${rel(f)}`, true);
  } catch (err) {
    ok(`JS syntax ${rel(f)}`, false, String(err.stderr).split("\n").slice(0, 3).join(" "));
  }
}

/* ---- CSS sanity: balanced braces/comments, every var() is defined ------------------ */
const cssFiles = files.filter((f) => f.endsWith(".css"));
const allCss = cssFiles.map((f) => readFileSync(f, "utf8")).join("\n");
const defined = new Set([...allCss.matchAll(/(--[\w-]+)\s*:/g)].map((m) => m[1]));
// custom properties set from JS or inline styles
["--i", "--d", "--reveal-delay", "--n", "--plate-ratio", "--rot", "--wheel-interval"].forEach((v) => defined.add(v));
for (const f of cssFiles) {
  const css = readFileSync(f, "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
  const open = (css.match(/\{/g) || []).length;
  const close = (css.match(/\}/g) || []).length;
  ok(`CSS braces balanced ${rel(f)}`, open === close, `${open} { vs ${close} }`);
  // var(--x) with no fallback must be defined somewhere
  const undefinedVars = [...new Set([...css.matchAll(/var\((--[\w-]+)\s*\)/g)].map((m) => m[1]).filter((v) => !defined.has(v)))];
  ok(`CSS vars defined ${rel(f)}`, undefinedVars.length === 0, undefinedVars.join(", "));
}

/* ---- Local assets, internal links, anchors ------------------------------------------- */
const idsOf = (html) => [...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]);
for (const [name, html] of Object.entries(pages)) {
  const ids = idsOf(html);
  const dupes = ids.filter((id, i) => ids.indexOf(id) !== i);
  ok(`${name}: no duplicate ids`, dupes.length === 0, [...new Set(dupes)].join(", "));

  // ARIA / label references
  const refs = [...html.matchAll(/\s(aria-(?:labelledby|describedby|controls)|for)="([^"]+)"/g)].flatMap((m) => m[2].split(/\s+/).map((id) => [m[1], id]));
  const missing = refs.filter(([, id]) => !ids.includes(id)).map(([a, id]) => `${a}→${id}`);
  // wheel tabs/panels are created at runtime by wheel.js
  const realMissing = missing.filter((m) => !/signature-wheel-(tab|panel)-/.test(m));
  ok(`${name}: aria/label references resolve`, realMissing.length === 0, realMissing.join(", "));

  // local src/href
  const urls = [...html.matchAll(/\s(?:src|href)="([^"]+)"/g)].map((m) => m[1]);
  const deadLinks = urls.filter((u) => u === "#" || u === "" || /^(tel|mailto):$/.test(u) || /^javascript:/i.test(u));
  ok(`${name}: no dead/placeholder links`, deadLinks.length === 0, deadLinks.join(", "));
  const local = urls.filter((u) => !/^(https?:|mailto:|tel:|#|data:)/.test(u));
  for (const u of local) {
    const [path, hash] = u.split("#");
    const target = join(ROOT, path);
    if (!existsSync(target)) {
      ok(`${name}: local file exists ${u}`, false);
      continue;
    }
    if (hash && path.endsWith(".html")) {
      const targetIds = idsOf(readFileSync(target, "utf8"));
      ok(`${name}: anchor ${u}`, targetIds.includes(hash));
    }
  }
  const missingLocal = local.filter((u) => !existsSync(join(ROOT, u.split("#")[0])));
  ok(`${name}: all local assets/pages exist (${local.length})`, missingLocal.length === 0, missingLocal.join(", "));

  // same-page anchors
  const samePage = urls.filter((u) => u.startsWith("#") && u.length > 1).map((u) => u.slice(1));
  const badAnchors = samePage.filter((id) => !ids.includes(id));
  ok(`${name}: same-page #anchors resolve`, badAnchors.length === 0, badAnchors.join(", "));

  ok(`${name}: exactly one <h1>`, (html.match(/<h1\b/g) || []).length === 1);
  ok(`${name}: unique <title>`, Object.values(pages).filter((h) => h.match(/<title>(.*?)<\/title>/)[1] === html.match(/<title>(.*?)<\/title>/)[1]).length === 1);
  ok(`${name}: has meta description`, /<meta name="description" content="[^"]{40,}">/.test(html));
  ok(`${name}: lang + viewport + skip link`, /<html lang="/.test(html) && /name="viewport"/.test(html) && /class="skip-link" href="#main"/.test(html));
  ok(`${name}: no references to build phases`, !/phase\s*\d/i.test(html.replace(/<!--[\s\S]*?-->/g, "")));
  const imgsNoAlt = [...html.matchAll(/<img\b(?![^>]*\salt=)[^>]*>/g)].length;
  ok(`${name}: every <img> has an alt attribute`, imgsNoAlt === 0, String(imgsNoAlt));
}

/* ---- Every content-nav destination exists -------------------------------------------- */
const sandbox = { console, URL, URLSearchParams, Intl, Date, Math, JSON };
sandbox.window = sandbox;
vm.createContext(sandbox);
for (const f of ["assets/js/content.js", "assets/js/core/utils.js", "assets/js/core/render.js", "assets/js/core/bind.js", "assets/js/core/seo.js"]) {
  vm.runInContext(readFileSync(join(ROOT, f), "utf8"), sandbox, { filename: f });
}
const content = sandbox.AURELIA_CONTENT;
const U = sandbox.Aurelia.utils;
for (const item of content.nav.concat([content.navCta])) {
  ok(`nav "${item.label}" → ${item.href} exists`, existsSync(join(ROOT, item.href)));
  const page = Object.entries(pages).find(([n]) => n === item.href);
  ok(`nav "${item.label}" page marker matches body data-page`, !!page && page[1].includes(`data-page="${item.page}"`));
}

/* ---- Helper edge cases ---------------------------------------------------------------- */
const noThrow = (fn) => { try { return { v: fn() }; } catch (e) { return { e: e.name + ": " + e.message }; } };
const priceCases = [
  [{ priceDecimals: -1 }, 12], [{ priceDecimals: 2.5 }, 12], [{ priceDecimals: "x" }, 12], [{ priceDecimals: 99 }, 12],
  [{ currency: "NOPE!" }, 12], [{ currency: "" }, 12], [{ locale: "???" }, 12], [{ locale: "de-DE", currency: "EUR", priceDecimals: 2 }, 12.5],
  [{}, NaN], [{}, "Market price"], [null, 5]
];
const origWarn = console.warn; console.warn = () => {};
for (const [settings, value] of priceCases) {
  const r = noThrow(() => U.formatPrice(value, settings));
  ok(`formatPrice(${JSON.stringify(value)}, ${JSON.stringify(settings)}) never throws`, !r.e && typeof r.v === "string", r.e || r.v);
}
console.warn = origWarn;
ok("formatPrice valid EUR/de-DE", U.formatPrice(12.5, { locale: "de-DE", currency: "EUR", priceDecimals: 2 }).includes("12,50"));
ok("formatPrice invalid currency → plain number", U.formatPrice(12, { currency: "NOPE!" }) === "12");

const hrefCases = { "javascript:alert(1)": "", " JaVaScRiPt:alert(1)": "", "java\tscript:alert(1)": "", "data:text/html,x": "", "vbscript:x": "",
  "menu.html": "menu.html", "#top": "#top", "https://x.test/": "https://x.test/", "tel:+1555": "tel:+1555", "mailto:a@b.c": "mailto:a@b.c", "ftp://x": "" };
for (const [input, expected] of Object.entries(hrefCases)) ok(`safeHref(${JSON.stringify(input)})`, U.safeHref(input) === expected, U.safeHref(input));
const endpointCases = { "https://formspree.io/f/abc": true, "http://localhost:8080/x": true, "http://evil.test/x": false, "javascript:x": false, "": false, "/relative": false };
for (const [input, expected] of Object.entries(endpointCases)) ok(`isSafeEndpoint(${JSON.stringify(input)})`, U.isSafeEndpoint(input) === expected);
ok("escapeHtml escapes markup in content", U.inlineMarkup('<img src=x onerror=alert(1)> *ok*') === "&lt;img src=x onerror=alert(1)&gt; <em>ok</em>");
ok("fill() replaces brand tokens", U.fill("{fullName} · {phone}", content) === `${content.brand.name} ${content.brand.descriptor} · ${content.contact.phone}`);
const ld = sandbox.Aurelia.seo.serialize({ name: "</script><script>alert(1)</script>" });
ok("JSON-LD serialisation cannot close <script>", !ld.includes("</script>"));

/* ---- Renaming the restaurant leaves no trace of the old brand -------------------------- */
{
  const { mkdtempSync, cpSync, writeFileSync: wf, rmSync } = await import("node:fs");
  const { tmpdir } = await import("node:os");
  const tmp = mkdtempSync(join(tmpdir(), "aurelia-rename-"));
  for (const item of ["assets", "tools", ...Object.keys(pages)]) cpSync(join(ROOT, item), join(tmp, item), { recursive: true });
  const cfile = join(tmp, "assets/js/content.js");
  wf(cfile, readFileSync(cfile, "utf8").replace('name: "Aurelia"', 'name: "Zephyr"'));
  execFileSync(process.execPath, [join(tmp, "tools/prerender.mjs")], { stdio: "pipe" });
  const leftovers = [];
  for (const name of Object.keys(pages)) {
    const html = readFileSync(join(tmp, name), "utf8").replace(/<!--[\s\S]*?-->/g, "");
    const hits = html.split("\n").filter((l) => /Aurelia/.test(l));
    if (hits.length) leftovers.push(`${name}: ${hits[0].trim().slice(0, 90)}`);
    if (!html.includes("Zephyr Dining")) leftovers.push(`${name}: new name missing`);
  }
  ok("renaming brand.name + prerender leaves no old brand in any page (titles, meta, nav, copy, footer)", leftovers.length === 0, leftovers.join(" | "));
  rmSync(tmp, { recursive: true, force: true });
}

/* ---- Prerendered HTML matches content.js ---------------------------------------------- */
try {
  execFileSync(process.execPath, [join(ROOT, "tools/prerender.mjs"), "--check"], { stdio: "pipe" });
  ok("static HTML in sync with content.js (prerender --check)", true);
} catch (err) {
  ok("static HTML in sync with content.js (prerender --check)", false, String(err.stdout));
}

console.log(`\n${passes} passed, ${failures} failed`);
process.exit(failures ? 1 : 0);
