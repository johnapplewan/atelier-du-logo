// Motion module, step 3: timeline (drag a bar, its ends, the playhead), free keyframes on layers, custom speed curves
// (cubic-bezier editor); undo; saved with the project; data checked on import. Phone: no timeline.
const { chromium, assert, open, check, done } = require("./helpers");

(async () => {
  const browser = await chromium.launch();
  const { ctx, page: p, errors } = await open(browser, { fresh: true });
  await p.click("#motionBtn"); await p.waitForSelector("#motion:not([hidden])");
  await p.click("#moPlay");   // pause
  await p.click('[data-q="mark"]'); await p.click('[data-preset="fondu"]'); await p.click("#moPlay");
  const A = await p.evaluate(() => __motion.state.motion.anims[0]);
  const rowSel = `.mo-tr[data-a="${A.id}"]`;
  const rows = await p.locator(".mo-tr:not(.head)").count();
  check("the timeline shows one row per animation", () => assert.strictEqual(rows, 1));

  // ruler: click seeks
  const ruler = await p.locator("[data-ruler]").boundingBox();
  await p.mouse.click(ruler.x + ruler.width * 0.5, ruler.y + ruler.height / 2);
  const t = await p.evaluate(() => __motion.state.t);
  check("clicking the ruler moves the playhead", () => assert.ok(Math.abs(t - 2.5) < 0.1, String(t)));

  // drag the bar: moves the start
  const bar = await p.locator(`${rowSel} .mo-bar2`).boundingBox();
  const px = ruler.width / 5;   // one second
  await p.mouse.move(bar.x + bar.width / 2, bar.y + bar.height / 2); await p.mouse.down();
  await p.mouse.move(bar.x + bar.width / 2 + px, bar.y + bar.height / 2, { steps: 5 }); await p.mouse.up();
  const moved = await p.evaluate(() => __motion.state.motion.anims[0]);
  check("dragging a bar moves the animation in time (snapped to frames)", () => { assert.ok(Math.abs(moved.at - (A.at + 1)) < 0.05, JSON.stringify(moved)); assert.ok(Math.abs(moved.len - A.len) < 1e-9); });

  // drag the right end: longer
  const bar2 = await p.locator(`${rowSel} .mo-bar2 .hr`).boundingBox();
  await p.mouse.move(bar2.x + bar2.width / 2, bar2.y + bar2.height / 2); await p.mouse.down();
  await p.mouse.move(bar2.x + bar2.width / 2 + px / 2, bar2.y + bar2.height / 2, { steps: 5 }); await p.mouse.up();
  const longer = await p.evaluate(() => __motion.state.motion.anims[0]);
  check("dragging the end of a bar makes the animation longer", () => { assert.ok(Math.abs(longer.len - (A.len + 0.5)) < 0.06, JSON.stringify(longer)); assert.strictEqual(longer.at, moved.at); });

  await p.keyboard.press("Control+z"); await p.keyboard.press("Control+z");
  const undone = await p.evaluate(() => __motion.state.motion.anims[0]);
  check("Ctrl+Z undoes timeline drags", () => { assert.strictEqual(undone.at, A.at); assert.strictEqual(undone.len, A.len); });

  // custom curve
  await p.click(`${rowSel} .lb`);
  await p.selectOption(`select[data-a="${A.id}"][data-k="ease"]`, "perso");
  const bz0 = await p.evaluate(() => __motion.state.motion.anims[0].bz);
  const mid0 = await p.evaluate(a => __motion.stateAt(a.at + a.len * 0.3)[a.ids[0]].o, A);
  await p.locator(`svg[data-bz="${A.id}"]`).scrollIntoViewIfNeeded();
  const h1 = await p.locator(`svg[data-bz="${A.id}"] circle[data-h="1"]`).boundingBox();
  await p.mouse.move(h1.x + h1.width / 2, h1.y + h1.height / 2); await p.mouse.down();
  await p.mouse.move(h1.x + h1.width / 2 + 60, h1.y + h1.height / 2 + 60, { steps: 4 }); await p.mouse.up();
  const bz1 = await p.evaluate(() => __motion.state.motion.anims[0].bz);
  const mid1 = await p.evaluate(a => __motion.stateAt(a.at + a.len * 0.3)[a.ids[0]].o, A);
  check("« Courbe personnalisée » : dragging a handle reshapes the speed curve", () => {
    assert.ok(Array.isArray(bz0) && bz0.length === 4); assert.notDeepStrictEqual(bz1, bz0); assert.ok(mid1 < mid0, mid0 + " → " + mid1); });

  // free keyframes
  await p.click('[data-q="word"]');
  await p.evaluate(() => __motion.seek(1));
  await p.click('[data-tab="key"]'); await p.click('[data-preset="cles"]'); await p.click("#moPlay");
  const K = await p.evaluate(() => __motion.state.motion.anims.find(a => a.k === "key"));
  const kv = await p.evaluate(k => { const id = k.ids[0], a = __motion.stateAt(k.keys[0].t)[id], b = __motion.stateAt(k.keys[1].t + (k.stg || 0) * 40)[id]; return { a: a.o, b: b.o }; }, K);
  check("« Clés libres » : two keys, hidden at the first, shown at the second", () => { assert.strictEqual(K.keys.length, 2); assert.strictEqual(K.keys[0].t, 1); assert.ok(kv.a === 0 && kv.b === 1, JSON.stringify(kv)); });
  await p.evaluate(() => __motion.seek(3));
  await p.click(`button[data-act="addkey"][data-id="${K.id}"]`);
  await p.evaluate(id => { const r = document.querySelector(`input[data-a="${id}"][data-kk="r"]`); r.value = "90"; r.dispatchEvent(new Event("input", { bubbles: true })); r.dispatchEvent(new Event("change", { bubbles: true })); }, K.id);
  const K2 = await p.evaluate(() => __motion.state.motion.anims.find(a => a.k === "key"));
  const rot = await p.evaluate(k => __motion.stateAt(3 + (k.stg || 0) * 40)[k.ids[0]].r, K2);
  check("« + Clé ici » adds a key at the playhead; its sliders set the values", () => { assert.strictEqual(K2.keys.length, 3); assert.strictEqual(K2.keys[2].t, 3); assert.strictEqual(K2.keys[2].r, 90); assert.strictEqual(rot, 90); });

  const kf = await p.locator(`.mo-tr[data-a="${K.id}"] .mo-kf`).nth(2).boundingBox();
  await p.mouse.move(kf.x + kf.width / 2, kf.y + kf.height / 2); await p.mouse.down();
  await p.mouse.move(kf.x + kf.width / 2 + px, kf.y + kf.height / 2, { steps: 5 }); await p.mouse.up();
  const K3 = await p.evaluate(() => __motion.state.motion.anims.find(a => a.k === "key"));
  check("dragging a key on the timeline moves it in time", () => assert.ok(Math.abs(K3.keys[2].t - 4) < 0.05, JSON.stringify(K3.keys)));

  const n = await p.evaluate(() => __motion.state.motion.anims.length);
  await p.keyboard.press("Escape"); await p.waitForTimeout(900);
  await p.reload(); await p.waitForFunction(() => window.__motion); await p.waitForTimeout(400);
  const kept = await p.evaluate(() => { const m = __motion.state.motion; return { n: m.anims.length, keys: (m.anims.find(a => a.k === "key") || {}).keys, bz: m.anims[0].bz }; });
  check("keys and custom curves are saved with the project", () => { assert.strictEqual(kept.n, n); assert.strictEqual(kept.keys.length, 3); assert.deepStrictEqual(kept.bz, bz1); });

  const val = await p.evaluate(() => {
    const key = (extra, k) => ({ v: 1, dur: 5, anims: [Object.assign({ id: "a1", p: "cles", k: "key", ids: ["x"], at: 0, len: 1, o: {}, keys: k || [{ t: 0, o: 0, x: 0, y: 0, s: 100, r: 0 }, { t: 1, o: 100, x: 0, y: 0, s: 100, r: 0 }] }, extra)] });
    return [__motion.valid(key({})),
      __motion.valid(key({}, [{ t: 0, o: 0, x: 0, y: 0, s: 100, r: 0 }])),                                   // one key
      __motion.valid(key({}, [{ t: 0, o: 0, x: 0, y: 0, s: 100, r: 0, z: 1 }, { t: 1, o: 1, x: 0, y: 0, s: 100, r: 0 }])),   // unknown field
      __motion.valid(key({}, [{ t: 0, o: 0, x: 0, y: 0, s: 1e9, r: 0 }, { t: 1, o: 1, x: 0, y: 0, s: 100, r: 0 }])),        // out of range
      __motion.valid({ v: 1, dur: 5, anims: [{ id: "a1", p: "fondu", k: "in", ids: ["x"], at: 0, len: 1, o: {}, ease: "perso" }] }),   // curve without points
      __motion.valid({ v: 1, dur: 5, anims: [{ id: "a1", p: "fondu", k: "in", ids: ["x"], at: 0, len: 1, o: {}, ease: "perso", bz: [2, 0, 1, 1] }] })];   // x out of 0..1
  });
  check("keys and curves are checked on import", () => assert.deepStrictEqual(val, [true, false, false, false, false, false]));

  // phone: no timeline (fine timing on a tablet or a computer)
  const ph = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const m = await ph.newPage(); m.on("pageerror", e => errors.push("mobile: " + e.message));
  await m.addInitScript(() => { try { localStorage.setItem("atelier-logo-welcome-later", "1"); } catch (_) {} });
  await m.goto(p.url()); await m.waitForFunction(() => window.__motion); await m.evaluate(() => __motion.open());
  const tlShown = await m.isVisible("#moTl");
  const tab = await browser.newContext({ viewport: { width: 820, height: 1180 }, hasTouch: true });
  const tp = await tab.newPage(); await tp.addInitScript(() => { try { localStorage.setItem("atelier-logo-welcome-later", "1"); } catch (_) {} });
  await tp.goto(p.url()); await tp.waitForFunction(() => window.__motion); await tp.evaluate(() => __motion.open());
  const tlTab = await tp.isVisible("#moTl");
  check("timeline hidden on a phone, shown on a tablet", () => { assert.strictEqual(tlShown, false); assert.strictEqual(tlTab, true); });
  await ph.close(); await tab.close();

  await ctx.close(); await browser.close();
  done(errors);
})();
