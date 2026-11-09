// Standalone app: local UI fonts, manifest, service worker, works offline after the first visit,
// « Télécharger l'appli » zip, exports saved by the browser outside the artifact.
const { chromium, assert, open, check, done } = require("./helpers");
const JSZip = require("../app/vendor/jszip.min.js");
const fs = require("fs");

(async () => {
  const browser = await chromium.launch();
  const { ctx, page: p, errors } = await open(browser);

  const ext = await p.evaluate(() => [...document.querySelectorAll("link[href],script[src]")].map(e => e.href || e.src).filter(u => !u.startsWith(location.origin)));
  check("no external UI resources (fonts, scripts) at load", () => assert.deepStrictEqual(ext, []));
  const fontsOk = await p.evaluate(async () => { await document.fonts.ready; return [document.fonts.check("16px Inter"), document.fonts.check("24px 'Instrument Serif'")]; });
  check("UI fonts served locally", () => assert.deepStrictEqual(fontsOk, [true, true]));
  const man = await p.evaluate(async () => { const m = await (await fetch(document.querySelector("link[rel=manifest]").href)).json(); const ok = await Promise.all(m.icons.map(i => fetch(i.src).then(r => r.ok))); return [m.display, m.start_url, ok.every(Boolean)]; });
  check("manifest with icons (installable)", () => assert.deepStrictEqual(man, ["standalone", "./", true]));

  // Content-Security-Policy: only its own origin (and Google Fonts for live text)
  const csp = await p.evaluate(async () => { const v = []; document.addEventListener("securitypolicyviolation", e => v.push(e.violatedDirective));
    try { await fetch("https://example.com/x"); } catch (_) {} await new Promise(r => setTimeout(r, 200));
    return [!!document.querySelector('meta[http-equiv="Content-Security-Policy"]'), v.includes("connect-src")]; });
  check("CSP: the page cannot send data to another site", () => assert.deepStrictEqual(csp, [true, true]));
  // service worker installed and controlling the page
  await p.evaluate(() => navigator.serviceWorker.ready);
  await p.reload(); await p.waitForFunction(() => navigator.serviceWorker.controller);
  const listed = await p.evaluate(async () => { const l = await (await fetch("files.json")).json(); const keys = await caches.keys(); const c = await caches.open(keys.find(k => k.startsWith("atelier-logo-"))); const missing = []; for (const f of l.files) if (!(await c.match(f))) missing.push(f); return [l.files.length, missing]; });
  check("service worker precached every app file", () => { assert.ok(listed[0] > 50); assert.deepStrictEqual(listed[1], []); });

  // offline: reload, the workshop and its typefaces still work
  await p.evaluate(() => { __atelier.layers.find(l => l.id === "point").fill = "#123456"; });
  await ctx.setOffline(true);
  await p.reload(); await p.waitForFunction(() => window.__atelier && __atelier.layers.length > 0);
  await p.fill("#txtIn", "Hors ligne"); await p.press("#txtIn", "Enter"); await p.waitForTimeout(400);
  await p.click("#fontBtn"); await p.waitForSelector("#fontMenu .fontitem svg", { timeout: 8000 });
  const mont = await p.evaluate(() => [...document.querySelectorAll("#fontMenu .fontitem")].findIndex(b => b.querySelector(".fn").textContent.trim() === "Montserrat"));
  await p.locator("#fontMenu .fontitem").nth(mont).click(); await p.waitForTimeout(800);
  const off = await p.evaluate(() => [__atelier.layers.filter(l => l.group === "word").map(l => l.ch).join(""), [...new Set(__atelier.layers.filter(l => l.group === "word").map(l => l.font))]]);
  check("offline: app opens, word re-shaped in another typeface", () => assert.deepStrictEqual(off, ["Horsligne", ["montserrat"]]));

  // exports are saved by the browser (no artifact)
  await p.click("#exportBtn"); await p.check("input[value=full]");
  const [dl] = await Promise.all([p.waitForEvent("download"), p.click("#exSave")]);
  check("export saved as a file outside the artifact", () => assert.match(dl.suggestedFilename(), /-logo\.svg$/));
  await p.click("#exClose");

  // « Télécharger l'appli » (offline, from the cache)
  await p.click("#aboutBtn");
  const [zdl] = await Promise.all([p.waitForEvent("download", { timeout: 60000 }), p.click("#abZip")]);
  const zip = await JSZip.loadAsync(fs.readFileSync(await zdl.path()));
  const names = Object.keys(zip.files);
  check("app zip: index, service worker, fonts, glyphs, readme", () => {
    for (const f of ["index.html", "sw.js", "manifest.webmanifest", "vendor/jszip.min.js", "vendor/fonts/ui.css", "glyphs/instrument.js", "LISEZMOI.txt"]) assert.ok(names.includes("atelier-du-logo/" + f), f);
  });
  await ctx.setOffline(false);

  done(errors.filter(e => !/example\.com/.test(e)));  // the blocked request above is deliberate
  await browser.close();
})();
