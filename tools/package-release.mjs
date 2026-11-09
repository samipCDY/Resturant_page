#!/usr/bin/env node
/**
 * SELLER TOOL (not shipped to buyers) — build the buyer download.
 *   node tools/package-release.mjs            → release/aurelia-dining-v<version>.zip
 *   node tools/package-release.mjs 1.0.1      → explicit version
 *
 * Includes only buyer-facing files (an allow-list) and refuses to package
 * when the HTML is out of sync with content.js. No dependencies (Node 18+).
 */
import { readFileSync, writeFileSync, readdirSync, statSync, mkdirSync, existsSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import { deflateRawSync } from "node:zlib";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const changelog = readFileSync(join(ROOT, "CHANGELOG.md"), "utf8");
const VERSION = process.argv[2] || (changelog.match(/## \[(\d+\.\d+\.\d+)\]/) || [])[1];
if (!VERSION) throw new Error("No version found (pass one, e.g. node tools/package-release.mjs 1.0.0)");
const NAME = `aurelia-dining-v${VERSION}`;

// 1. Allow-list
const INCLUDE_FILES = ["README.md", "CUSTOMIZATION.md", "DEPLOYMENT.md", "BROWSER-SUPPORT.md", "CREDITS.md", "CHANGELOG.md", "LICENSE.txt",
  "docs/ARCHITECTURE.md", "tools/prerender.mjs"];
const INCLUDE_DIRS = ["assets"];
const EXCLUDE = /(^|\/)(\.DS_Store|Thumbs\.db|desktop\.ini|.*\.log|.*\.tmp|.*~)$/i;

const walk = (dir) => readdirSync(join(ROOT, dir)).flatMap((f) => {
  const rel = `${dir}/${f}`;
  return statSync(join(ROOT, rel)).isDirectory() ? walk(rel) : [rel];
});
const files = [
  ...readdirSync(ROOT).filter((f) => f.endsWith(".html")),
  ...INCLUDE_FILES,
  ...INCLUDE_DIRS.flatMap(walk)
].filter((f) => !EXCLUDE.test(f)).sort();

for (const f of INCLUDE_FILES) if (!existsSync(join(ROOT, f))) throw new Error(`Missing required file: ${f}`);

// 2. Guards
try {
  execFileSync(process.execPath, [join(ROOT, "tools/prerender.mjs"), "--check"], { stdio: "pipe" });
} catch {
  console.error("✖ HTML is out of date with content.js. Run: node tools/prerender.mjs");
  process.exit(1);
}
const license = readFileSync(join(ROOT, "LICENSE.txt"), "utf8");
const undecided = (license.match(/SELLER DECISION/g) || []).length;
if (undecided) console.warn(`! LICENSE.txt still contains ${undecided} [SELLER DECISION] item(s). Finalise it before selling.`);

// 3. Minimal ZIP writer (deflate, UTF-8 names)
const CRC = new Uint32Array(256).map((_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
const crc32 = (buf) => { let c = 0xffffffff; for (const b of buf) c = CRC[(c ^ b) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
const now = new Date();
const dosTime = (now.getHours() << 11) | (now.getMinutes() << 5) | (now.getSeconds() >> 1);
const dosDate = ((now.getFullYear() - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate();

const locals = [];
const centrals = [];
let offset = 0;
for (const f of files) {
  const data = readFileSync(join(ROOT, f));
  const comp = deflateRawSync(data, { level: 9 });
  const name = Buffer.from(`${NAME}/${f}`, "utf8");
  const crc = crc32(data);
  const local = Buffer.alloc(30);
  local.writeUInt32LE(0x04034b50, 0); local.writeUInt16LE(20, 4); local.writeUInt16LE(0x0800, 6); local.writeUInt16LE(8, 8);
  local.writeUInt16LE(dosTime, 10); local.writeUInt16LE(dosDate, 12); local.writeUInt32LE(crc, 14);
  local.writeUInt32LE(comp.length, 18); local.writeUInt32LE(data.length, 22); local.writeUInt16LE(name.length, 26); local.writeUInt16LE(0, 28);
  locals.push(local, name, comp);
  const central = Buffer.alloc(46);
  central.writeUInt32LE(0x02014b50, 0); central.writeUInt16LE(20, 4); central.writeUInt16LE(20, 6); central.writeUInt16LE(0x0800, 8);
  central.writeUInt16LE(8, 10); central.writeUInt16LE(dosTime, 12); central.writeUInt16LE(dosDate, 14); central.writeUInt32LE(crc, 16);
  central.writeUInt32LE(comp.length, 20); central.writeUInt32LE(data.length, 24); central.writeUInt16LE(name.length, 28);
  central.writeUInt32LE(offset, 42);
  centrals.push(central, name);
  offset += 30 + name.length + comp.length;
}
const centralBuf = Buffer.concat(centrals);
const end = Buffer.alloc(22);
end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(files.length, 8); end.writeUInt16LE(files.length, 10);
end.writeUInt32LE(centralBuf.length, 12); end.writeUInt32LE(offset, 16);

mkdirSync(join(ROOT, "release"), { recursive: true });
const out = join(ROOT, "release", `${NAME}.zip`);
const zip = Buffer.concat([...locals, centralBuf, end]);
writeFileSync(out, zip);
writeFileSync(join(ROOT, "release", `${NAME}.manifest.txt`), files.join("\n") + "\n");
console.log(`✔ ${out}\n  ${files.length} files, ${(zip.length / 1024).toFixed(0)} KB`);
