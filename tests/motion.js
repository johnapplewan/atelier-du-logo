// Motion module, step 1: opens from « Animer » over the workshop, draws the open project's logo with the workshop's
// renderer, plays / scrubs / steps frame by frame, keeps a 1–12 s duration in the project, and never edits the drawing.
const { chromium, assert, open, check, done } = require("./helpers");

(async () => {
  const browser = await chromium.launch();
  const { ctx, page: p, errors } = await open(browser, { fresh: true });
  const before = await p.evaluate(() => JSON.stringify(__atelier.layers));
  const nVis = await p.evaluate(() => __atelier.layers.filter(l => l.visible !== false && l.subs.length).length);

  await p.click("#motionBtn");
  await p.waitForSelector("#motion:not([hidden])");
  const st = await p.evaluate(() => ({ g: document.querySelectorAll("#moSvg g[data-mo]").length, playing: __motion.state.playing, dur: __motion.state.motion.dur }));
  check("« Animer » opens the module with every visible layer and starts playing", () => { assert.strictEqual(st.g, nVis); assert.ok(st.playing); assert.strictEqual(st.dur, 5); });
  await p.waitForTimeout(400);
  const t1 = await p.evaluate(() => __motion.state.t);
  check("playback advances time", () => assert.ok(t1 > 0.15, String(t1)));

  await p.keyboard.press("Space");
  const paused = await p.evaluate(() => __motion.state.playing);
  check("Space pauses (and does not reach the workshop)", () => assert.strictEqual(paused, false));
  const ops = await p.evaluate(() => { __motion.seek(0); const a = [...document.querySelectorAll("#moSvg g[data-mo]")].map(g => +g.getAttribute("opacity"));
    __motion.seek(__motion.state.motion.dur); const b = [...document.querySelectorAll("#moSvg g[data-mo]")].map(g => ({ o: +g.getAttribute("opacity"), tr: g.getAttribute("transform") }));
    return { a, b }; });
  check("at 0 s nothing is shown yet, at the end the logo is exactly as drawn", () => { assert.ok(ops.a.every(o => o === 0)); assert.ok(ops.b.every(x => x.o === 1 && !x.tr)); });

  await p.evaluate(() => __motion.seek(0));
  await p.keyboard.press("ArrowRight"); await p.keyboard.press("ArrowRight");
  const tf = await p.evaluate(() => __motion.state.t);
  check("→ steps one frame at a time (30 i/s)", () => assert.ok(Math.abs(tf - 2 / 30) < 1e-6, String(tf)));

  await p.fill("#moDur", "12"); await p.dispatchEvent("#moDur", "input");
  const d = await p.evaluate(() => ({ dur: __motion.state.motion.dur, max: +document.querySelector("#moScrub").max, out: document.querySelector("#moDurOut").textContent }));
  check("duration up to 12 s", () => { assert.strictEqual(d.dur, 12); assert.strictEqual(d.max, 12); assert.strictEqual(d.out, "12 s"); });

  await p.keyboard.press("Escape");
  const closed = await p.evaluate(() => ({ open: __motion.state.open, hidden: document.querySelector("#motion").hidden, layers: JSON.stringify(__atelier.layers) }));
  check("Escape returns to the workshop, drawing untouched", () => { assert.ok(!closed.open && closed.hidden); assert.strictEqual(closed.layers, before); });

  await p.waitForTimeout(900);
  await p.reload(); await p.waitForFunction(() => window.__atelier && window.__motion);
  await p.waitForTimeout(400);
  const kept = await p.evaluate(() => __motion.state.motion.dur);
  check("the duration is saved with the project", () => assert.strictEqual(kept, 12));

  // phone: the module fits the screen, the transport stays reachable
  const ph = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  const m = await ph.newPage(); m.on("pageerror", e => errors.push("mobile: " + e.message));
  await m.addInitScript(() => { try { localStorage.setItem("atelier-logo-welcome-later", "1"); } catch (_) {} });
  await m.goto(p.url()); await m.waitForFunction(() => window.__motion);
  await m.evaluate(() => __motion.open());
  const lay = await m.evaluate(() => { const f = document.querySelector("#moFrame").getBoundingClientRect(), b = document.querySelector("#moPlay").getBoundingClientRect();
    return { fw: f.width, right: f.right, playBottom: b.bottom, h: innerHeight, sw: document.documentElement.scrollWidth }; });
  check("mobile: stage and play button on screen, no sideways scroll", () => { assert.ok(lay.fw > 300 && lay.right <= 390); assert.ok(lay.playBottom <= lay.h); assert.ok(lay.sw <= 390); });
  await ph.close();

  await ctx.close(); await browser.close();
  done(errors);
})();
