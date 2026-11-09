// Detachable panels: « Fenêtres » moves tools, layers, selection, palette and bubbles into their own windows,
// driven by the main window (one drawing, one history); closing a window or « Rattacher » puts the panel back.
const { chromium, assert, open, worldToScreen, check, done } = require("./helpers");

(async () => {
  const browser = await chromium.launch();
  const { ctx, page: p, errors } = await open(browser);
  const ws = worldToScreen(p);
  const popup = async key => { if (await p.isHidden("#winMenu")) await p.click("#winBtn"); const [w] = await Promise.all([ctx.waitForEvent("page"), p.check(`#winMenu [data-win="${key}"]`)]);
    w.on("pageerror", e => errors.push(key + ": " + e.message)); await w.waitForSelector("aside section"); return w; };

  const offered = await p.isVisible("#winBtn");
  check("« Fenêtres » offered in the standalone app", () => assert.ok(offered));
  const layersW = await popup("layers"), selW = await popup("selection"), toolsW = await popup("tools"), palW = await popup("palette");
  const where = await p.evaluate(() => ["#layersSec", "#inspector", "#toolsSec", "#palSec"].map(s => Document.prototype.querySelector.call(document, s) ? "main" : "window"));
  const marks = await p.locator(".detached:visible").count();
  check("panels moved into their windows, placeholders left behind", () => { assert.deepStrictEqual(where, ["window", "window", "window", "window"]); assert.strictEqual(marks, 4); });
  const styled = await layersW.evaluate(() => getComputedStyle(document.querySelector("h2")).fontFamily);
  check("windows carry the workshop styles", () => assert.match(styled, /Instrument Serif/));

  await selW.setViewportSize({ width: 340, height: 720 }); await selW.screenshot({ path: __dirname + "/s17.png" });
  // layers window -> selection everywhere
  await layersW.click('.layer[data-id="disque"] .nm'); await selW.screenshot({ path: __dirname + "/s17.png" });
  const s1 = await p.evaluate(() => __atelier.sel.layer), insp = await selW.textContent("#inspector");
  check("click in the layers window selects in the workshop and fills the selection window", () => { assert.strictEqual(s1, "disque"); assert.match(insp, /Disque/i); });
  // canvas click -> layers window follows
  await p.keyboard.press("v"); const q = await ws(156, 100); await p.mouse.click(q.x, q.y);
  const hl = await layersW.evaluate(() => [...document.querySelectorAll(".layer.sel")].map(l => l.dataset.id));
  check("selection on the canvas shown in the layers window", () => assert.deepStrictEqual(hl, ["point"]));

  // tools window: click and keyboard shortcut
  await toolsW.click('[data-tool="pen"]'); const t1 = await p.evaluate(() => document.querySelector('[data-tool="pen"]').classList.contains("on"));
  await toolsW.keyboard.press("a"); const t2 = await toolsW.evaluate(() => document.querySelector('[data-tool="points"]').classList.contains("on"));
  check("tools window: click and shortcuts change the tool", () => assert.ok(t1 && t2));

  // palette window shows the swatches; inspector edit from its window is undoable in the workshop
  const sw = await palW.locator(".sw-btn").count();
  check("palette window shows the colours", () => assert.ok(sw >= 3, String(sw)));
  await layersW.click('.layer[data-id="point"] .nm', { button: "right" }); await p.waitForSelector("#confirmDlg[open]"); await p.click("#cfYes"); await p.waitForTimeout(100);
  const gone = await layersW.evaluate(() => !document.querySelector('.layer[data-id="point"]'));
  await p.keyboard.press("Control+z"); await p.waitForTimeout(100);
  const back = await layersW.evaluate(() => !!document.querySelector('.layer[data-id="point"]'));
  check("delete from the layers window, undo in the workshop: both windows agree", () => assert.ok(gone && back));

  // closing a window puts the panel back; « Rattacher » too
  await layersW.close(); await p.waitForTimeout(200);
  const backL = await p.evaluate(() => !!Document.prototype.querySelector.call(document, "#layersSec .layer") && !document.querySelector('[data-detached="layers"]'));
  check("closing the window puts the panel back", () => assert.ok(backL));
  await p.click('[data-detached="selection"] button'); await p.waitForTimeout(200);
  const backS = await p.evaluate(() => [!!Document.prototype.querySelector.call(document, "#inspector"), !!Document.prototype.querySelector.call(document, "#fontSec")]);
  check("« Rattacher » brings the panel back and closes its window", () => { assert.deepStrictEqual(backS, [true, true]); assert.ok(selW.isClosed()); });
  await p.screenshot({ path: __dirname + "/s16.png" });
  await toolsW.close(); await palW.close();

  done(errors);
  await browser.close();
})();
