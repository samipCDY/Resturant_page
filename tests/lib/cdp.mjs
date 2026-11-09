/**
 * Minimal Chrome DevTools Protocol driver — no dependencies (Node 22+ for WebSocket).
 * Finds Chrome/Edge automatically; override with CHROME_PATH=/path/to/chrome.
 */
import { spawn } from "node:child_process";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const CANDIDATES = [
  process.env.CHROME_PATH,
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  "C:/Program Files/Microsoft/Edge/Application/msedge.exe",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
  "/usr/bin/google-chrome", "/usr/bin/google-chrome-stable", "/usr/bin/chromium", "/usr/bin/chromium-browser", "/usr/bin/microsoft-edge"
].filter(Boolean);

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export async function launch({ port = 9400 + Math.floor(Math.random() * 400) } = {}) {
  const exe = CANDIDATES.find((p) => existsSync(p));
  if (!exe) throw new Error("Chrome/Edge not found. Set CHROME_PATH.");
  const profile = mkdtempSync(join(tmpdir(), "aurelia-test-"));
  const proc = spawn(exe, ["--headless=new", `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`,
    "--no-first-run", "--no-default-browser-check", "--hide-scrollbars", "--mute-audio", "about:blank"], { stdio: "ignore" });

  let target;
  for (let i = 0; i < 60 && !target; i++) {
    try { target = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find((t) => t.type === "page"); } catch {}
    if (!target) await sleep(200);
  }
  if (!target) throw new Error("Could not connect to the browser");
  const version = await (await fetch(`http://127.0.0.1:${port}/json/version`)).json();

  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((r) => ws.addEventListener("open", r, { once: true }));
  let id = 0;
  const pending = new Map();
  const listeners = new Map();
  const logs = [];
  ws.addEventListener("message", (ev) => {
    const msg = JSON.parse(ev.data);
    if (msg.id && pending.has(msg.id)) { pending.get(msg.id)(msg); pending.delete(msg.id); return; }
    if (msg.method === "Runtime.consoleAPICalled" && /error|warning/.test(msg.params.type)) logs.push(`[console.${msg.params.type}] ` + msg.params.args.map((a) => a.value ?? a.description).join(" "));
    if (msg.method === "Runtime.exceptionThrown") logs.push("[exception] " + (msg.params.exceptionDetails.exception?.description || msg.params.exceptionDetails.text));
    if (msg.method === "Log.entryAdded" && msg.params.entry.level === "error") logs.push(`[log] ${msg.params.entry.text} ${msg.params.entry.url || ""}`);
    (listeners.get(msg.method) || []).forEach((fn) => fn(msg.params));
  });

  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const i = ++id;
    pending.set(i, (m) => (m.error ? reject(new Error(`${method}: ${m.error.message}`)) : resolve(m.result)));
    ws.send(JSON.stringify({ id: i, method, params }));
  });
  const on = (method, fn) => listeners.set(method, (listeners.get(method) || []).concat(fn));
  const off = (method) => listeners.delete(method);

  const evaluate = async (expression) => {
    const r = await send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
    if (r.exceptionDetails) throw new Error("evaluate: " + (r.exceptionDetails.exception?.description || r.exceptionDetails.text));
    return r.result.value;
  };

  await send("Runtime.enable");
  await send("Page.enable");
  await send("Log.enable");

  const api = {
    browser: version.Browser,
    logs,
    send, on, off, evaluate,
    async goto(url, wait = 2200) {
      await send("Page.navigate", { url });
      await sleep(wait);
    },
    viewport: (width, height, mobile = false) => send("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 1, mobile }),
    media: (features) => send("Emulation.setEmulatedMedia", { features }),
    async key(key, opts = {}) {
      const codes = { Tab: 9, Enter: 13, Escape: 27, " ": 32, ArrowLeft: 37, ArrowUp: 38, ArrowRight: 39, ArrowDown: 40, Home: 36, End: 35 };
      const p = { key, code: key === " " ? "Space" : key, windowsVirtualKeyCode: codes[key] || 0, modifiers: opts.shift ? 8 : 0 };
      await send("Input.dispatchKeyEvent", { type: "keyDown", ...p, text: key === "Enter" ? "\r" : key === " " ? " " : undefined });
      await send("Input.dispatchKeyEvent", { type: "keyUp", ...p });
    },
    async click(x, y) {
      await send("Input.dispatchMouseEvent", { type: "mouseMoved", x, y });
      await send("Input.dispatchMouseEvent", { type: "mousePressed", x, y, button: "left", clickCount: 1 });
      await send("Input.dispatchMouseEvent", { type: "mouseReleased", x, y, button: "left", clickCount: 1 });
    },
    /** Click the centre of the first element matching selector (real mouse input). */
    async clickEl(selector) {
      const r = await evaluate(`(() => { const e = document.querySelector(${JSON.stringify(selector)}); if (!e) return null; e.scrollIntoView({block:'center', behavior:'instant'}); const b = e.getBoundingClientRect(); return {x: b.x + b.width/2, y: b.y + b.height/2}; })()`);
      if (!r) throw new Error("clickEl: not found " + selector);
      await sleep(150);
      const r2 = await evaluate(`(() => { const b = document.querySelector(${JSON.stringify(selector)}).getBoundingClientRect(); return {x: b.x + b.width/2, y: b.y + b.height/2}; })()`);
      await api.click(r2.x, r2.y);
    },
    async close() {
      try { ws.close(); } catch {}
      proc.kill();
      await sleep(300);
      try { rmSync(profile, { recursive: true, force: true }); } catch {}
    }
  };
  return api;
}
