// Pen (Plume), pencil (Crayon), visible handles, Alt+drag handles, open paths and their conversion.
const { chromium, assert, open, worldToScreen, check, done } = require("./helpers");

(async () => {
  const browser = await chromium.launch();
  const { page: p, errors } = await open(browser);
  const ws = worldToScreen(p);
  const last = () => p.evaluate(() => __atelier.layers[__atelier.layers.length - 1]);
  const n0 = await p.evaluate(() => __atelier.layers.length);

  // Pen: corner, curve (click-drag), corner, then click the first point = closed shape
  await p.keyboard.press("p");
  const tool = await p.evaluate(() => document.querySelector('[data-tool="pen"]').classList.contains("on"));
  check("P selects the pen", () => assert.ok(tool));
  let q = await ws(300, 300); await p.mouse.click(q.x, q.y);
  q = await ws(400, 260); await p.mouse.move(q.x, q.y); await p.mouse.down(); const q2 = await ws(440, 260); await p.mouse.move(q2.x, q2.y, { steps: 4 }); await p.mouse.up();
  q = await ws(380, 380); await p.mouse.click(q.x, q.y);
  q = await ws(300, 300); await p.mouse.click(q.x, q.y);
  let L = await last();
  check("pen: closed shape with a smooth point", () => { assert.strictEqual(L.subs[0].length, 3); assert.ok(!L.open); assert.ok(L.subs[0][1].o && L.subs[0][1].i, JSON.stringify(L.subs[0][1]));
    assert.ok(Math.abs(L.subs[0][1].o.x - 440) < 2 && Math.abs(L.subs[0][1].i.x - 360) < 2); });
  const lab = await p.evaluate(() => { document.querySelector("#histBtn").click(); const t = document.querySelector("#histList .hl").textContent; document.querySelector("#histClose").click(); return t; });
  check("pen shape in the history", () => assert.strictEqual(lab, "Forme à la plume"));

  // Pen: open path with Enter, Backspace removes the last point
  q = await ws(500, 300); await p.mouse.click(q.x, q.y); q = await ws(560, 340); await p.mouse.click(q.x, q.y); q = await ws(620, 300); await p.mouse.click(q.x, q.y);
  q = await ws(700, 300); await p.mouse.click(q.x, q.y); await p.keyboard.press("Backspace"); await p.keyboard.press("Enter");
  L = await last();
  check("pen: open path (line) with Enter, Backspace drops the last point", () => { assert.ok(L.open); assert.strictEqual(L.subs[0].length, 3); assert.ok(L.sw > 0); });
  const svgOpen = await p.evaluate(id => document.querySelector(`#art [data-layer="${id}"][stroke-linecap]`).getAttribute("d"), L.id);
  check("open path drawn as a line (no closing segment)", () => assert.ok(!/Z/.test(svgOpen), svgOpen));

  // stroke width, then convert to a filled shape
  await p.fill("#swR", "12"); await p.dispatchEvent("#swR", "change"); await p.waitForTimeout(100);
  L = await last(); check("line thickness from the inspector", () => assert.strictEqual(L.sw, 12));
  await p.click("#toShape"); L = await last();
  check("line converted to a filled shape", () => { assert.ok(!L.open && !L.sw); assert.ok(L.subs[0].length >= 6); });

  // Pencil: a freehand line (mouse)
  await p.keyboard.press("n");
  const pts = []; for (let i = 0; i <= 40; i++) pts.push(await ws(300 + i * 8, 420 + Math.sin(i / 5) * 30));
  await p.mouse.move(pts[0].x, pts[0].y); await p.mouse.down(); for (const pt of pts) await p.mouse.move(pt.x, pt.y); await p.mouse.up();
  L = await last();
  check("pencil: freehand line fitted into a few editable curves", () => { assert.ok(L.open); assert.ok(L.subs[0].length >= 3 && L.subs[0].length < 25, String(L.subs[0].length)); assert.ok(L.subs[0].some(n => n.i || n.o)); });

  // Pencil: brush with stylus pressure (CDP pen events)
  await p.click('#drawOpts [data-dm="brush"]');
  const cdp = await p.context().newCDPSession(p);
  const pen = (type, x, y, force) => cdp.send("Input.dispatchMouseEvent", { type, x, y, button: "left", buttons: type === "mouseReleased" ? 0 : 1, clickCount: 1, pointerType: "pen", force });
  const bp = []; for (let i = 0; i <= 30; i++) bp.push(await ws(560 + i * 10, 420));
  await pen("mousePressed", bp[0].x, bp[0].y, 0.1); for (let i = 0; i < bp.length; i++) await pen("mouseMoved", bp[i].x, bp[i].y, 0.1 + 0.9 * Math.sin(Math.PI * i / 30)); await pen("mouseReleased", bp[bp.length - 1].x, bp[bp.length - 1].y, 0);
  L = await last();
  const thick = await p.evaluate(id => { const L = __atelier.layers.find(l => l.id === id); const ys = x0 => { const v = L.subs[0].filter(n => Math.abs(n.x - x0) < 12).map(n => n.y); return v.length ? Math.max(...v) - Math.min(...v) : 0; }; return [ys(565), ys(710)]; }, L.id);
  check("pencil brush: filled shape, thicker where the stylus pressed harder", () => { assert.ok(!L.open); assert.ok(thick[1] > thick[0] * 1.5, JSON.stringify(thick)); });
  await p.screenshot({ path: __dirname + "/s13.png" });

  // Points: "all handles" toggle and Alt+drag on a corner point
  await p.keyboard.press("a"); await p.click('.layer[data-id="cadre"] .nm');
  await p.check('#drawOpts [data-do="handles"]');
  const hcount = await p.evaluate(() => document.querySelectorAll("#ovl [data-h]").length);
  check("all handles shown on demand", () => assert.strictEqual(hcount, 8));
  // the frame's corner points have one handle each side: pull handles from the first point of the dot (a smooth circle) -> already has; use a pen corner point
  await p.click(`.layer[data-id="${(await p.evaluate(n => __atelier.layers[n].id, n0))}"] .nm`);
  q = await ws(380, 380); await p.keyboard.down("Alt"); await p.mouse.move(q.x, q.y); await p.mouse.down(); const q3 = await ws(420, 380); await p.mouse.move(q3.x, q3.y, { steps: 4 }); await p.mouse.up(); await p.keyboard.up("Alt");
  const pulled = await p.evaluate(n => __atelier.layers[n].subs[0][2], n0);
  check("Alt+drag pulls symmetric handles out of a corner point", () => { assert.ok(pulled.o && pulled.i); assert.ok(Math.abs(pulled.o.x - 420) < 2 && Math.abs(pulled.i.x - 340) < 2, JSON.stringify(pulled)); });
  // double-click: back to a corner point
  q = await ws(380, 380); await p.mouse.dblclick(q.x, q.y);
  const corner = await p.evaluate(n => __atelier.layers[n].subs[0][2], n0);
  check("double-click toggles corner / smooth", () => assert.ok(!corner.o && !corner.i));

  // open paths survive export and reload
  await p.click("#exportBtn"); await p.check("input[value=full]"); const svg = await p.inputValue("#svgcode"); await p.click("#exClose");
  check("lines exported as strokes", () => assert.match(svg, /stroke-linecap="round"/));
  await p.waitForTimeout(900); await p.reload(); await p.waitForTimeout(500);
  const kept = await p.evaluate(() => __atelier.layers.filter(l => l.open).length);
  check("lines kept after reload", () => assert.ok(kept >= 1));

  done(errors);
  await browser.close();
})();
