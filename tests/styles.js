// Styles in the inspector: effects (kept editable), transformations (new curves), complete styles; export and reload.
const { chromium, assert, open, check, done } = require("./helpers");

(async () => {
  const browser = await chromium.launch();
  const { page: p, errors } = await open(browser);
  const L = id => p.evaluate(id => __atelier.layers.find(l => l.id === id), id);

  // effect on one layer, from the inspector
  await p.click('.layer[data-id="disque"] .nm');
  await p.selectOption("#styleSel", "fx:ombre"); await p.waitForTimeout(200);
  let d = await L("disque");
  check("effect added to the selected layer, curves untouched", () => { assert.deepStrictEqual(d.fx.map(e => e.t), ["ombre"]); assert.strictEqual(d.subs[0].length, 4); });
  const art = await p.evaluate(() => document.querySelector("#art").innerHTML);
  check("effect drawn on the canvas", () => assert.match(art, /feGaussianBlur/));
  // intensity slider and colour of the effect, then remove it
  await p.evaluate(() => { const r = document.querySelector('#inspector [data-fxa="0"]'); r.value = 90; r.dispatchEvent(new Event("input", { bubbles: true })); r.dispatchEvent(new Event("change", { bubbles: true })); });
  d = await L("disque");
  check("effect intensity", () => assert.strictEqual(d.fx[0].a, 90));
  await p.keyboard.press("Control+z"); d = await L("disque");
  check("intensity change undoable", () => assert.notStrictEqual(d.fx[0].a, 90));
  await p.click('#inspector [data-fxdel="0"]'); d = await L("disque");
  check("effect removed", () => assert.ok(!d.fx));

  // complete style on several layers (Maj+clic in the list selects the range cadre..point)
  await p.click('.layer[data-id="cadre"] .nm'); await p.click('.layer[data-id="point"] .nm', { modifiers: ["Shift"] });
  await p.selectOption("#styleSel", "st:cartoon"); await p.waitForTimeout(300);
  const cart = await p.evaluate(() => __atelier.layers.filter(l => l.fx && l.fx.some(e => e.t === "cerne")).map(l => l.name));
  check("complete style on a range selection (cartoon: rounded + cel + outline)", () => assert.deepStrictEqual(cart, ["Cadre · arrondi", "Disque · arrondi", "Point · arrondi"]));
  await p.keyboard.press("Control+z"); await p.waitForTimeout(100);
  const back = await p.evaluate(() => __atelier.layers.map(l => l.id).slice(0, 3));
  check("one undo step brings the original layers back", () => assert.deepStrictEqual(back, ["cadre", "disque", "point"]));

  // transformation: low poly facets in their own group and palette
  await p.click('.layer[data-id="disque"] .nm');
  await p.selectOption("#styleSel", "tr:lowpoly"); await p.waitForTimeout(400);
  const lp = await p.evaluate(() => { const ls = __atelier.layers.filter(l => /^lowpoly-/.test(l.id)); return { n: ls.length, tris: ls.reduce((s, l) => s + l.subs.length, 0), grp: [...new Set(ls.map(l => l.grp))].length, gone: !__atelier.layers.some(l => l.id === "disque") }; });
  check("low poly: facets grouped, original replaced", () => { assert.ok(lp.n >= 3 && lp.tris > 20, JSON.stringify(lp)); assert.strictEqual(lp.grp, 1); assert.ok(lp.gone); });
  await p.keyboard.press("Control+z");

  // pixel art, one line, arabesques produce curves
  for (const [tr, re] of [["pixel", /^pixel-/], ["oneline", /^oneline-/], ["arabesque", /^arabesque-/]]) {
    await p.click('.layer[data-id="disque"] .nm'); await p.selectOption("#styleSel", "tr:" + tr); await p.waitForTimeout(300);
    const ok = await p.evaluate(src => { const re = new RegExp(src); return __atelier.layers.filter(l => re.test(l.id)).reduce((s, l) => s + l.subs.reduce((t, x) => t + x.length, 0), 0); }, re.source);
    check("transformation " + tr + " draws curves", () => assert.ok(ok > 4, String(ok)));
    await p.keyboard.press("Control+z"); await p.waitForTimeout(100);
  }

  // effects are exported, and survive a reload
  await p.click('.layer[data-id="point"] .nm'); await p.selectOption("#styleSel", "fx:extrusion"); await p.waitForTimeout(200);
  await p.click("#exportBtn"); await p.check("input[value=full]");
  const svg = await p.inputValue("#svgcode"); await p.click("#exClose");
  check("effects in the SVG export", () => assert.match(svg, /<use href="#/));
  const img = await p.evaluate(s => new Promise(ok => { const i = new Image(); i.onload = () => ok(i.naturalWidth); i.onerror = () => ok(0); i.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(s); }), svg);
  check("exported SVG with effects renders (PNG path)", () => assert.ok(img > 0));
  await p.waitForTimeout(900); await p.reload(); await p.waitForTimeout(500);
  const kept = await L("point");
  check("effects kept after reload", () => assert.deepStrictEqual((kept.fx || []).map(e => e.t), ["extrusion"]));

  done(errors);
  await browser.close();
})();
