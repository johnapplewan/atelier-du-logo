// Shared helpers for the Playwright tests (Chromium, app/index.html opened from disk).
const { chromium } = require("playwright");
const path = require("path");
const assert = require("assert");

// app/ is served over http://127.0.0.1 (a real origin: file:// pages can lose localStorage across reloads in Chromium)
const http = require("http"), fs = require("fs");
const ROOT = path.resolve(__dirname, "../app");
const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8" };
let server = null, APP = null;
function serve() {
  if (server) return Promise.resolve(APP);
  server = http.createServer((req, res) => {
    const rel = decodeURIComponent(req.url.split("?")[0]).replace(/^\/+/, "") || "index.html", file = path.join(ROOT, rel);
    if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { "Content-Type": TYPES[path.extname(file)] || "application/octet-stream" }); fs.createReadStream(file).pipe(res);
  });
  server.unref();
  return new Promise(ok => server.listen(0, "127.0.0.1", () => { APP = "http://127.0.0.1:" + server.address().port + "/index.html"; ok(APP); }));
}

// Collects page errors; Google Fonts requests are blocked on purpose (offline, deterministic runs).
async function open(browser, opts = {}) {
  const ctx = await browser.newContext(Object.assign({ viewport: { width: 1440, height: 900 } }, opts.context || {}));
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", e => errors.push(e.message));
  page.on("console", m => { if (m.type() === "error" && !/net::ERR_FAILED/.test(m.text())) errors.push(m.text()); });
  await page.route(/fonts\.(googleapis|gstatic)/, r => r.abort());
  // the welcome dialog is tested in start.js; other tests start with it postponed ("Plus tard")
  if (!opts.welcome) await page.addInitScript(() => { try { localStorage.setItem("atelier-logo-welcome-later", "1"); } catch (_) {} });
  if (opts.init) await page.addInitScript(opts.init);
  await page.goto(await serve());
  await page.waitForFunction(() => window.__atelier && Array.isArray(window.__atelier.layers));
  await page.waitForTimeout(300);
  return { ctx, page, errors };
}

// world coordinates -> page coordinates
function worldToScreen(page) {
  return (x, y) => page.evaluate(([x, y]) => {
    const r = document.querySelector("#cv").getBoundingClientRect(), v = __atelier.view;
    return { x: r.left + v.tx + x * v.k, y: r.top + v.ty + y * v.k };
  }, [x, y]);
}

const layer = (page, id) => page.evaluate(id => __atelier.layers.find(l => l.id === id), id);

let failures = 0;
function check(name, fn) {
  try { fn(); console.log("ok   " + name); }
  catch (e) { failures++; console.log("FAIL " + name + "\n     " + e.message); }
}
function done(errors) {
  check("no page errors", () => assert.deepStrictEqual(errors, []));
  if (failures) { console.log(failures + " failure(s)"); process.exitCode = 1; }
}

module.exports = { chromium, assert, open, worldToScreen, layer, check, done };
