// Claude's patch channel: atelier/patch merges changed layers by id, shows the undo banner (kept across reloads),
// and "Annuler la modification de Claude" restores the user's version.
const { chromium, assert, open, layer, check, done } = require("./helpers");

const dbMock = () => {
  const store = JSON.parse(sessionStorage.getItem("__store") || "{}"), subs = {};
  window.__store = store;
  const persist = () => sessionStorage.setItem("__store", JSON.stringify(store));
  const doc = path => ({ get: async () => ({ exists: !!store[path], data: () => store[path], metadata: {} }),
    set: async d => { store[path] = d; persist(); }, onSnapshot: fn => { subs[path] = fn; return () => {}; } });
  window.__remote = (path, d) => { store[path] = d; persist(); subs[path] && subs[path]({ exists: true, data: () => d, metadata: { hasPendingWrites: false } }); };
  window.claude = { use: async n => n === "db" ? { doc } : null };
};

(async () => {
  const browser = await chromium.launch();
  const { page: p, errors } = await open(browser, { init: dbMock });

  const before = await layer(p, "point");
  // Claude moves the dot and squares the frame's corners (only these two layers are sent)
  const patch = [
    { id: "point", subs: before.subs.map(s => s.map(n => ({ x: n.x - 56, y: n.y + 56, i: n.i && { x: n.i.x - 56, y: n.i.y + 56 }, o: n.o && { x: n.o.x - 56, y: n.o.y + 56 } }))) },
    { id: "cadre", subs: [[{ x: 28, y: 28, i: null, o: null }, { x: 228, y: 28, i: null, o: null }, { x: 228, y: 228, i: null, o: null }, { x: 28, y: 228, i: null, o: null }]] },
  ];
  await p.evaluate(pl => __remote("atelier/patch", { at: Date.now() + 1000, note: "coins vifs", layers: JSON.stringify(pl) }), patch);
  await p.waitForTimeout(1200);

  const st = await p.evaluate(() => ({ n: __atelier.layers.length, frame: __atelier.layers.find(l => l.id === "cadre").subs[0].length,
    dot: __atelier.layers.find(l => l.id === "point").subs[0][0], word: __atelier.layers.find(l => l.id === "lettre-1").font }));
  check("patch merged by id, other layers untouched", () => {
    assert.strictEqual(st.n, 9); assert.strictEqual(st.frame, 4);
    assert.deepStrictEqual([st.dot.x, st.dot.y], [before.subs[0][0].x - 56, before.subs[0][0].y + 56]); assert.strictEqual(st.word, "instrument");
  });
  const saved = await p.evaluate(() => !!__store["atelier/shape"]);
  check("shape saved after patch", () => assert.ok(saved));
  const bar = await p.isVisible("#claudeBar"), msg = await p.textContent("#claudeMsg");
  check("undo banner shown with Claude's note", () => { assert.ok(bar); assert.match(msg, /coins vifs/); });
  await p.screenshot({ path: __dirname + "/s7.png" });

  await p.reload(); await p.waitForTimeout(600);
  const barAfter = await p.isVisible("#claudeBar"), frameAfter = (await layer(p, "cadre")).subs[0].length;
  check("banner and patched curves survive a reload", () => { assert.ok(barAfter); assert.strictEqual(frameAfter, 4); });

  await p.click("#claudeUndo");
  const restored = await p.evaluate(() => [__atelier.layers.find(l => l.id === "cadre").subs[0].length, __atelier.layers.find(l => l.id === "point").subs[0][0]]);
  check("undo restores the user's curves", () => { assert.strictEqual(restored[0], 8); assert.deepStrictEqual(restored[1], before.subs[0][0]); });
  const barGone = !(await p.isVisible("#claudeBar"));
  check("banner closed after undo", () => assert.ok(barGone));

  // the same patch is not applied twice (once the undo is saved)
  await p.waitForTimeout(1000); await p.reload(); await p.waitForTimeout(600);
  const again = (await layer(p, "cadre")).subs[0].length;
  check("an applied patch is not replayed", () => assert.strictEqual(again, 8));

  done(errors);
  await browser.close();
})();
