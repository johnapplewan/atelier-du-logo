// Motion module, step 2: quick animations on layers (appear, disappear, text, motion, camera) with their sliders,
// applied to a selection with a stagger; undo; saved with the project; the workshop's drawing is never edited.
const { chromium, assert, open, check, done } = require("./helpers");

(async () => {
  const browser = await chromium.launch();
  const { ctx, page: p, errors } = await open(browser, { fresh: true });
  const before = await p.evaluate(() => JSON.stringify(__atelier.layers));
  await p.click("#motionBtn"); await p.waitForSelector("#motion:not([hidden])");
  await p.click("#moPlay");   // pause

  const presetCount = await p.evaluate(() => __motion.presets.length);
  check("a catalogue of quick animations (appear, text, motion, camera)", () => assert.ok(presetCount >= 20, String(presetCount)));

  // text: letter by letter, left to right
  await p.click('[data-q="word"]');
  await p.click('[data-tab="texte"]');
  await p.click('[data-preset="lettres"]');
  await p.click("#moPlay");
  const txt = await p.evaluate(() => {
    const a = __motion.state.motion.anims[0], info = a.ids.map(id => { const g = document.querySelector(`#moSvg g[data-mo="${CSS.escape(id)}"]`); return { id, x: g.getBBox().x }; }).sort((u, v) => u.x - v.x);
    const L = info[0].id, R = info[info.length - 1].id, s = __motion.stateAt(a.at + a.stg * 1.5);
    const end = __motion.stateAt(__motion.state.motion.dur);
    return { k: a.k, ord: a.ord, n: a.ids.length, left: s[L].o, right: s[R].o, endO: a.ids.every(id => end[id].o === 1 && end[id].y === 0) };
  });
  check("« Lettre par lettre » on the text: left letters come first, all at rest at the end", () => {
    assert.strictEqual(txt.k, "in"); assert.strictEqual(txt.ord, "gauche"); assert.ok(txt.n > 5);
    assert.ok(txt.left > 0 && txt.right === 0, JSON.stringify(txt)); assert.ok(txt.endO); });

  // contour drawing and mask on the symbol
  await p.click('[data-q="mark"]');
  await p.click('[data-tab="in"]');
  await p.click('[data-preset="trace"]');
  await p.click('[data-preset="masque"]');
  await p.click("#moPlay");
  const sym = await p.evaluate(() => { const an = __motion.state.motion.anims, tr = an.find(a => a.p === "trace"), ms = an.find(a => a.p === "masque");
    __motion.seek(tr.at + tr.len * .4);
    const paths = [...document.querySelectorAll("#moSvg [data-tr]")].filter(e => e.style.display !== "none");
    const off = paths.length ? +paths[0].getAttribute("stroke-dashoffset") : -1;
    __motion.seek(ms.at + ms.len * .5); const clipped = document.querySelectorAll("#moSvg g[data-c][clip-path]").length;
    __motion.seek(__motion.state.motion.dur); const left = document.querySelectorAll("#moSvg g[data-c][clip-path]").length + [...document.querySelectorAll("#moSvg [data-tr]")].filter(e => e.style.display !== "none").length;
    return { drawn: paths.length, off, clipped, left }; });
  check("« Tracé du contour » draws the outlines, « Révélation par masque » clips, nothing left at the end", () => {
    assert.ok(sym.drawn > 0 && sym.off > 0 && sym.off < 1, JSON.stringify(sym)); assert.ok(sym.clipped > 0); assert.strictEqual(sym.left, 0); });

  // liquid (filter) and a disappearance
  await p.click('[data-preset="liquide"]'); await p.click("#moPlay");
  await p.click('[data-tab="out"]'); await p.click('[data-preset="fondu"]'); await p.click("#moPlay");
  const fx = await p.evaluate(() => { const an = __motion.state.motion.anims, lq = an.find(a => a.p === "liquide"), out = an.find(a => a.k === "out");
    __motion.seek(lq.at + lq.len * .3); const filt = document.querySelectorAll("#moSvg g[data-mo][filter]").length;
    const end = __motion.stateAt(__motion.state.motion.dur);
    return { filt, ease: out.ease, endO: out.ids.map(id => end[id].o), at: out.at, dur: __motion.state.motion.dur }; });
  check("« Liquide » runs through a filter; a disappearance hides its layers at the end", () => {
    assert.ok(fx.filt > 0); assert.strictEqual(fx.ease, "entree"); assert.ok(fx.endO.every(o => o === 0)); assert.ok(fx.at > 0 && fx.at < fx.dur); });

  // camera orbit on the whole scene
  await p.click('[data-tab="cam"]'); await p.click('[data-preset="orbite"]'); await p.click("#moPlay");
  const cam = await p.evaluate(() => { __motion.seek(0.01); const a = document.querySelector("#moSvg g[data-scene]").getAttribute("transform");
    const c = __motion.state.motion.anims.find(x => x.k === "cam"); __motion.seek(c.at + c.len + .05); const b = document.querySelector("#moSvg g[data-scene]").getAttribute("transform");
    return { a, b, ids: c.ids }; });
  check("camera « Orbite » moves the whole scene, back to front view at the end", () => { assert.match(cam.a || "", /skewY/); assert.strictEqual(cam.b, null); assert.deepStrictEqual(cam.ids, ["__scene"]); });

  // sliders and undo
  const id = await p.evaluate(() => __motion.state.motion.anims[0].id);
  await p.click(`.mo-anim[data-id="${id}"] summary`).catch(() => {});
  await p.click('[data-q="none"]');
  await p.evaluate(id => { const d = document.querySelector(`.mo-anim[data-id="${id}"]`); d.open = true; }, id);
  const len0 = await p.evaluate(() => __motion.state.motion.anims[0].len);
  await p.evaluate(id => { const r = document.querySelector(`input[data-a="${id}"][data-k="len"]`); r.value = "2"; r.dispatchEvent(new Event("input", { bubbles: true })); r.dispatchEvent(new Event("change", { bubbles: true })); }, id);
  const len1 = await p.evaluate(() => __motion.state.motion.anims[0].len);
  await p.keyboard.press("Control+z");
  const len2 = await p.evaluate(() => __motion.state.motion.anims[0].len);
  check("a slider changes the duration of an animation, Ctrl+Z puts it back", () => { assert.strictEqual(len1, 2); assert.strictEqual(len2, len0); });

  const n = await p.evaluate(() => __motion.state.motion.anims.length);
  await p.keyboard.press("Escape");
  const after = await p.evaluate(() => JSON.stringify(__atelier.layers));
  check("the workshop's drawing is untouched", () => assert.strictEqual(after, before));
  await p.waitForTimeout(900);
  await p.reload(); await p.waitForFunction(() => window.__motion); await p.waitForTimeout(400);
  const kept = await p.evaluate(() => __motion.state.motion.anims.length);
  check("animations are saved with the project", () => assert.strictEqual(kept, n));

  const val = await p.evaluate(() => {
    const ok = { v: 1, dur: 5, anims: [{ id: "a1", p: "fondu", k: "in", ids: ["x"], at: 0, len: 1, o: {} }] };
    const bad1 = { v: 1, dur: 5, anims: [{ id: "a1", p: "inconnu", k: "in", ids: ["x"], at: 0, len: 1, o: {} }] };
    const bad2 = { v: 1, dur: 5, anims: [{ id: "a1", p: "montee", k: "in", ids: ["x"], at: 0, len: 1, o: { dir: "<script>" } }] };
    const bad3 = { v: 1, dur: 5, anims: [{ id: "a1\"><img>", p: "fondu", k: "in", ids: ["x"], at: 0, len: 1, o: {} }] };
    const bad4 = { v: 1, dur: 5, anims: [{ id: "a1", p: "zoom", k: "in", ids: ["x"], at: 0, len: 1, o: { sc: 1e9 } }] };
    return [__motion.valid(ok), __motion.valid(bad1), __motion.valid(bad2), __motion.valid(bad3), __motion.valid(bad4)]; });
  check("imported animation data is checked (unknown preset, bad values and ids refused)", () => assert.deepStrictEqual(val, [true, false, false, false, false]));

  await ctx.close(); await browser.close();
  done(errors);
})();
