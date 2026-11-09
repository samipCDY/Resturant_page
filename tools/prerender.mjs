#!/usr/bin/env node
/**
 * Aurelia Dining — tools/prerender.mjs   (OPTIONAL, no dependencies, Node 18+)
 *
 * The site always reads assets/js/content.js in the browser, so editing that
 * file is enough for visitors. This tool ALSO writes the same content into the
 * HTML files, which matters for:
 *   - social previews (Facebook, LinkedIn, Slack… don't run JavaScript),
 *   - search engines that index the raw HTML,
 *   - visitors with JavaScript disabled or a broken content.js.
 *
 * Usage (from the template folder):
 *   node tools/prerender.mjs          update every *.html file
 *   node tools/prerender.mjs --check  report files that are out of date (exit 1), change nothing
 *
 * It only rewrites:
 *   <title>, meta description, Open Graph / Twitter tags, the JSON-LD block,
 *   regions marked  data-render="…"><!--r-->…<!--/r-->,
 *   and elements with data-bind / data-bind-html / data-bind-href / data-bind-img.
 * Everything else in your HTML is left exactly as it is.
 */
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const CHECK = process.argv.includes("--check");
const SCRIPTS = [
  "assets/js/content.js",
  "assets/js/core/utils.js",
  "assets/js/core/render.js",
  "assets/js/core/bind.js",
  "assets/js/core/seo.js",
  "assets/js/components/sections.js",
  "assets/js/components/menu.js",
  "assets/js/components/gallery.js",
  "assets/js/components/reservation.js"
];

/* ---- load the browser scripts in a sandbox --------------------------------- */
const sandbox = { console, URL, URLSearchParams, Intl, Date, Math, JSON };
sandbox.window = sandbox;
vm.createContext(sandbox);
for (const file of SCRIPTS) {
  const code = readFileSync(join(ROOT, file), "utf8");
  try {
    vm.runInContext(code, sandbox, { filename: file });
  } catch (err) {
    console.error(`\n✖ Could not load ${file}:\n  ${err.message}\n`);
    if (file.endsWith("content.js")) console.error("  Check content.js for a missing comma, quote or bracket near the line above.\n");
    process.exit(2);
  }
}
const A = sandbox.Aurelia;
const content = sandbox.AURELIA_CONTENT;
if (!content) {
  console.error("✖ content.js did not define window.AURELIA_CONTENT");
  process.exit(2);
}
const { utils } = A;

/* ---- tiny HTML helpers -------------------------------------------------------- */
const esc = utils.escapeHtml;
const unescape = (s) => s.replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");

function dataAttrs(tag) {
  const out = {};
  for (const m of tag.matchAll(/\sdata-([a-z0-9-]+)(?:="([^"]*)")?/g)) {
    const key = m[1].replace(/-([a-z0-9])/g, (_, c) => c.toUpperCase());
    out[key] = unescape(m[2] ?? "");
  }
  return out;
}

function attr(tag, name) {
  const m = tag.match(new RegExp(`\\s${name}="([^"]*)"`));
  return m ? unescape(m[1]) : null;
}

function setAttr(tag, name, value) {
  const re = new RegExp(`(\\s${name}=)"[^"]*"`);
  const encoded = `"${esc(value)}"`;
  if (re.test(tag)) return tag.replace(re, `$1${encoded}`);
  return tag.replace(/\s*(\/?)>$/, ` ${name}=${encoded}$1>`);
}

/* ---- per-file transform ------------------------------------------------------------ */
function transform(html, file) {
  const page = (html.match(/<body[^>]*\sdata-page="([^"]+)"/) || [])[1] || "home";
  const ctx = { page, runtime: false };
  const problems = [];

  // 1. data-render regions
  html = html.replace(/(<([a-zA-Z][\w-]*)\b[^>]*\sdata-render="([^"]+)"[^>]*>)<!--r-->[\s\S]*?<!--\/r-->/g, (all, open, tag, name) => {
    const fn = A.render.get(name);
    if (!fn) { problems.push(`unknown renderer "${name}"`); return all; }
    const out = fn(content, dataAttrs(open), ctx);
    return typeof out === "string" ? `${open}<!--r-->${out}<!--/r-->` : all;
  });

  // 2. data-bind (text-only elements)
  html = html.replace(/(<([a-zA-Z][\w-]*)\b[^>]*\sdata-bind="([^"]+)"[^>]*>)([^<]*)(<\/\2>)/g, (all, open, tag, path, inner, close) => {
    const value = A.bind.resolve(content, path);
    return value === undefined ? all : `${open}${esc(value)}${close}`;
  });

  // 3. data-bind-html
  html = html.replace(/(<([a-zA-Z][\w-]*)\b[^>]*\sdata-bind-html="([^"]+)"[^>]*>)([\s\S]*?)(<\/\2>)/g, (all, open, tag, path, inner, close) => {
    const value = A.bind.resolve(content, path);
    return value === undefined ? all : `${open}${utils.inlineMarkup(value, content)}${close}`;
  });

  // 4. data-bind-href / data-bind-img (attributes on the opening tag)
  html = html.replace(/<[a-zA-Z][\w-]*\b[^>]*\sdata-bind-(?:href|img)="[^"]+"[^>]*>/g, (tag) => {
    const hrefPath = attr(tag, "data-bind-href");
    if (hrefPath) {
      const value = A.bind.resolve(content, hrefPath);
      const href = value === undefined ? "" : utils.safeHref(value);
      if (href) tag = setAttr(tag, "href", href);
    }
    const imgPath = attr(tag, "data-bind-img");
    if (imgPath) {
      const img = A.bind.imageAttrs(content, imgPath, attr(tag, "data-widths"), attr(tag, "data-aspect"));
      if (img) {
        tag = setAttr(tag, "src", img.src);
        if (img.srcset) tag = setAttr(tag, "srcset", img.srcset);
        tag = setAttr(tag, "alt", img.alt);
      } else problems.push(`image path "${imgPath}" not found in content.js`);
    }
    return tag;
  });

  // 5. <head> metadata
  const meta = A.seo.meta(content, page);
  html = html.replace(/<title>[\s\S]*?<\/title>/, `<title>${esc(meta.title)}</title>`);
  const metaTags = [
    ['name="description"', meta.description],
    ['property="og:site_name"', utils.fill("{fullName}", content)],
    ['property="og:title"', meta.title],
    ['property="og:description"', meta.description],
    ['property="og:image"', meta.image],
    ['property="og:image:alt"', meta.imageAlt],
    ['name="twitter:title"', meta.title],
    ['name="twitter:description"', meta.description],
    ['name="twitter:image"', meta.image]
  ];
  for (const [key, value] of metaTags) {
    html = html.replace(new RegExp(`<meta ${key} content="[^"]*">`), `<meta ${key} content="${esc(value || "")}">`);
  }

  // Canonical + og:url only once the real site URL is known.
  html = html.replace(/\n\s*<link rel="canonical"[^>]*>|\n\s*<meta property="og:url"[^>]*>/g, "");
  if (meta.url) {
    html = html.replace(/(<meta name="twitter:card"[^>]*>)/, `<link rel="canonical" href="${esc(meta.url)}">\n  <meta property="og:url" content="${esc(meta.url)}">\n  $1`);
  }

  // 6. JSON-LD
  html = html.replace(/(<script type="application\/ld\+json" data-jsonld>)[\s\S]*?(<\/script>)/, (all, open, close) => {
    const data = A.seo.schema(content);
    return `${open}${data ? A.seo.serialize(data) : "{}"}${close}`;
  });

  if (problems.length) console.warn(`  ! ${file}: ${problems.join("; ")}`);
  return html;
}

/* ---- run ------------------------------------------------------------------------------ */
const files = readdirSync(ROOT).filter((f) => f.endsWith(".html")).sort();
let changed = 0;
for (const file of files) {
  const path = join(ROOT, file);
  const before = readFileSync(path, "utf8");
  const after = transform(before, file);
  if (after !== before) {
    changed++;
    if (CHECK) console.log(`  out of date: ${file}`);
    else {
      writeFileSync(path, after, "utf8");
      console.log(`  updated: ${file}`);
    }
  }
}

if (CHECK) {
  console.log(changed ? `\n${changed} file(s) differ from content.js. Run: node tools/prerender.mjs` : "All HTML files match content.js.");
  process.exit(changed ? 1 : 0);
}
console.log(changed ? `\nDone: ${changed} of ${files.length} file(s) updated from content.js.` : "Everything already matches content.js.");
