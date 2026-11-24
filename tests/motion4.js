// Motion module, step 4: one-click recipes. Each recipe writes a complete, valid set of animations that ends on the
// logo exactly as drawn; « Du croquis au rendu » draws the construction and the pencil, then sweeps the render in
// (the fondu / efface effects of the default example); applying a recipe asks before replacing, and is undoable.
const { chromium, assert, open, check, done } = require("./helpers");

(async () => {
  const browser = await chromium.launch();
  const apply = async (p, k) => { await p.click(`[data-recipe="${k}"]`); if (await p.isVisible("#confirmDlg[open]")) await p.click("#cfYes"); await p.waitForTimeout(60); await p.click("#moPlay").catch(() => {}); await p.evaluate(() => __motion.seek(0)); };

  // every recipe on the neutral example
  const { ctx, page: p, errors } = await open(browser);
  await p.click("#motionBtn"); await p.waitForSelector("#motion:not([hidden])"); await p.click("#moPlay");
  const keys = await p.$$eval("[data-recipe]", bs => bs.map(b => b.dataset.recipe));
  check("at least 8 one-click recipes, « Du croquis au rendu » among them", () => { assert.ok(keys.length >= 8); assert.ok(keys.includes("croquis")); });
  const res = [];
  for (const k of keys) {
    await apply(p, k);
    res.push(await p.evaluate(k => { const m = __motion.state.motion, end = __motion.stateAt(m.dur), ids = Object.keys(end).filter(id => id !== "__scene");
      const rest = ids.every(id => { const s = end[id]; return Math.abs(s.o - 1) < 1e-6 && Math.abs(s.x) < 1e-6 && Math.abs(s.y) < 1e-6 && Math.abs(s.s - 1) < 1e-6 && Math.abs(s.r) < 1e-6 && (s.draw === null || s.draw >= 1) && (!s.clip || s.clip.v >= 1) && !s.blur && !s.liq; });
      const hidden = ids.every(id => end[id].o < 1e-6);
      return { k, n: m.anims.length, valid: __motion.valid(m), rest, hidden, inside: m.anims.every(a => a.at < m.dur) }; }, k));
  }
  check("each recipe writes valid animations that start within the duration", () => res.forEach(r => { assert.ok(r.n > 0 && r.valid && r.inside, JSON.stringify(r)); }));
  check("each recipe ends on the logo as drawn (« Entrée et sortie » ends hidden, for a loop)", () => res.forEach(r => { if (r.k === "boucle") assert.ok(r.hidden, r.k); else assert.ok(r.rest, JSON.stringify(r)); }));

  const before = await p.evaluate(() => JSON.stringify(__motion.state.motion.anims));
  await p.click('[data-recipe="elegante"]');
  const asked = await p.isVisible("#confirmDlg[open]");
  await p.click("#cfNo");
  const kept = await p.evaluate(() => JSON.stringify(__motion.state.motion.anims));
  check("replacing existing animations asks first (« Non » keeps them)", () => { assert.ok(asked); assert.strictEqual(kept, before); });
  await apply(p, "elegante"); await p.keyboard.press("Control+z");
  const undone = await p.evaluate(() => JSON.stringify(__motion.state.motion.anims));
  check("Ctrl+Z puts back the animations replaced by a recipe", () => assert.strictEqual(undone, before));
  await ctx.close();

  // « Du croquis au rendu » on the workshop's own logo
  const o = await open(browser, { fresh: true }); const q = o.page;
  await q.click("#motionBtn"); await q.waitForSelector("#motion:not([hidden])"); await q.click("#moPlay");
  await apply(q, "croquis");
  const sk = await q.evaluate(() => {
    const m = __motion.state.motion, sw = m.anims.filter(a => a.p === "balayage"), tr = m.anims.filter(a => a.p === "trace");
    const g = () => +document.querySelector("#mo-fx-tranche-2g").getAttribute("x1");
    const art = +document.querySelector("#cv-fx-tranche-2g").getAttribute("x1");
    const pencil = sw[0].ids.find(id => /^croquis-/.test(id)), render = "tranche";
    __motion.seek(0.05); const g0 = g();
    __motion.seek(sw[0].at - 0.05); const before = __motion.stateAt(sw[0].at - 0.05);
    __motion.seek(m.dur); const g1 = g();
    const vb = document.querySelector("#moSvg").viewBox.baseVal;
    return { sweeps: sw.length, traces: tr.length, g0, g1, art, right: vb.x + vb.width, pencilDrawn: before[pencil].draw === null || before[pencil].draw >= 1, renderHiddenBefore: !!before[render].sweep && before[render].sweep.u === 0 };
  });
  check("« Du croquis au rendu » : construction and pencil are drawn, then two sweeps (symbol, then text)", () => { assert.strictEqual(sk.sweeps, 2); assert.ok(sk.traces >= 3); assert.ok(sk.pencilDrawn); assert.ok(sk.renderHiddenBefore); });
  check("the sweep starts past the right edge (all pencil) and ends exactly where the drawing puts it", () => { assert.ok(sk.g0 > sk.art + 100, JSON.stringify(sk)); assert.strictEqual(sk.g1, sk.art); });
  await o.ctx.close();

  // phone: recipes are the main tool
  const ph = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const m = await ph.newPage(); m.on("pageerror", e => errors.push("mobile: " + e.message));
  await m.addInitScript(() => { try { localStorage.setItem("atelier-logo-welcome-later", "1"); } catch (_) {} });
  await m.goto(q.url()); await m.waitForFunction(() => window.__motion); await m.evaluate(() => __motion.open());
  await m.tap('[data-recipe="rebond"]');
  const nm = await m.evaluate(() => __motion.state.motion.anims.length);
  check("phone: a recipe applies with one tap", () => assert.ok(nm > 0));
  await ph.close();

  await browser.close();
  done(errors.concat(o.errors));
})();
