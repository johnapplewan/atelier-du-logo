// Phone and tablet: full canvas, bottom tab bar, one panel at a time as a sheet, compact header with a menu,
// bubbles and node editing by touch.
const { chromium, assert, open, worldToScreen, check, done } = require("./helpers");
const { devices } = require("playwright");

(async () => {
  const browser = await chromium.launch();
  const { page: p, ctx, errors } = await open(browser, { context: Object.assign({}, devices["iPhone 13"], { deviceScaleFactor: 1 }) });
  const ws = worldToScreen(p);
  const vis = sel => p.evaluate(s => { const e = document.querySelector(s); if (!e) return false; const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(e).visibility !== "hidden"; }, sel);

  const lay = await p.evaluate(() => ({ hdr: document.querySelector("header").offsetHeight, cv: document.querySelector("#cv").getBoundingClientRect().height, h: innerHeight }));
  check("phone: compact header, canvas takes most of the screen", () => { assert.ok(lay.hdr < 70, lay.hdr); assert.ok(lay.cv > lay.h * 0.7, JSON.stringify(lay)); });
  const closed = [await vis("#mbar"), await vis("#layersSec"), await vis("#inspector")];
  check("phone: tab bar shown, panels hidden until asked", () => assert.deepStrictEqual(closed, [true, false, false]));

  await p.tap('#mbar [data-sheet="layers"]');
  const lv = [await vis("#layersSec"), await vis("#toolsSec"), await vis("#palSec")];
  check("Calques tab opens only the layers sheet", () => assert.deepStrictEqual(lv, [true, false, false]));
  await p.tap('.layer[data-id="disque"] .nm');
  const s1 = await p.evaluate(() => __atelier.sel.layer);
  check("tap a layer in the sheet selects it", () => assert.strictEqual(s1, "disque"));
  await p.tap('#mbar [data-sheet="selection"]');
  const insp = await p.textContent("#inspector");
  check("Sélection tab shows the inspector of that layer", () => assert.match(insp, /Disque/));

  // choosing a tool closes the sheet; bubble tool opens the bubble editor
  await p.tap('#mbar [data-sheet="tools"]'); await p.tap('#toolsSec [data-tool="bubble"]');
  const afterTool = await vis("#toolsSec");
  let q = await ws(90, 200); await p.touchscreen.tap(q.x, q.y); await p.waitForTimeout(100);
  const ed = [await vis("#noteText"), await p.evaluate(() => __atelier.notes.length)];
  check("choosing a tool closes the sheet; a bubble opens its editor", () => { assert.ok(!afterTool); assert.deepStrictEqual(ed, [true, 1]); });
  await p.fill("#noteText", "Plus rond"); await p.locator("#noteText").blur();
  const badge = await p.textContent("#mbNotes");
  check("open bubbles counted on the Bulles tab", () => assert.strictEqual(badge, "1"));

  // Points tool + touch drag of a node; a tap on the canvas closes the sheet
  await p.tap('#mbar [data-sheet="tools"]'); await p.tap('#toolsSec [data-tool="points"]');
  q = await ws(45, 200); await p.touchscreen.tap(q.x, q.y);
  q = await ws(84, 28); const cdp = await ctx.newCDPSession(p);
  const touch = (type, x, y) => cdp.send("Input.dispatchTouchEvent", { type, touchPoints: type === "touchEnd" ? [] : [{ x, y }] });
  await touch("touchStart", q.x, q.y); for (let i = 1; i <= 5; i++) await touch("touchMove", q.x, q.y - i * 3); await touch("touchEnd");
  const node = await p.evaluate(() => __atelier.layers.find(l => l.id === "cadre").subs[0][0].y);
  check("touch drag moves a node on the phone", () => assert.ok(node < 27, String(node)));

  // menu: secondary actions behind ☰, closed after use
  const hidden = await vis("#aboutBtn");
  await p.tap("#menuBtn"); const shown = await vis("#aboutBtn"); await p.tap("#aboutBtn");
  const dlg = [await p.evaluate(() => document.querySelector("#aboutDlg").open), await p.evaluate(() => document.querySelector("header").classList.contains("menuopen"))];
  check("☰ menu reveals À propos, Projets, Charte…; closes after a choice", () => { assert.ok(!hidden && shown); assert.deepStrictEqual(dlg, [true, false]); });
  await p.tap("#abClose");
  await p.screenshot({ path: __dirname + "/s18.png" });

  // tablet landscape keeps the three columns
  const { page: t, ctx: tctx } = await open(browser, { context: Object.assign({}, devices["iPad (gen 7) landscape"], { deviceScaleFactor: 1 }) });
  const tl = await t.evaluate(() => [getComputedStyle(document.querySelector("#mbar")).display, document.querySelector("#layersSec").getBoundingClientRect().width > 0]);
  check("tablet landscape: three columns, no tab bar", () => assert.deepStrictEqual(tl, ["none", true]));
  await tctx.close();

  done(errors);
  await browser.close();
})();
