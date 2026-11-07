// Shared helpers for the Playwright tests (Chromium, app/index.html opened from disk).
const { chromium } = require("playwright");
const path = require("path");
const assert = require("assert");

const APP = "file://" + path.resolve(__dirname, "../app/index.html");

// Collects page errors; Google Fonts requests are blocked on purpose (offline, deterministic runs).
async function open(browser, opts = {}) {
  const ctx = await browser.newContext(Object.assign({ viewport: { width: 1440, height: 900 } }, opts.context || {}));
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", e => errors.push(e.message));
  page.on("console", m => { if (m.type() === "error" && !/net::ERR_FAILED/.test(m.text())) errors.push(m.text()); });
  await page.route(/fonts\.(googleapis|gstatic)/, r => r.abort());
  if (opts.init) await page.addInitScript(opts.init);
  await page.goto(APP);
  await page.waitForFunction(() => window.__atelier && window.__atelier.layers.length > 0);
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
