// Working with Claude: bubbles sent through the comments capability, remote shape / notes updates from the db, undo.
const { chromium, assert, open, worldToScreen, check, done } = require("./helpers");

(async () => {
  const browser = await chromium.launch();
  const { page: p, errors } = await open(browser, { init: () => {
    const store = {}, subs = {}; window.__sent = []; window.__store = store;
    const doc = path => ({ get: async () => ({ exists: !!store[path], data: () => store[path], metadata: {} }),
      set: async d => { store[path] = d; }, onSnapshot: fn => { subs[path] = fn; return () => {}; } });
    window.__remote = (path, d) => { store[path] = d; subs[path] && subs[path]({ exists: true, data: () => d, metadata: { hasPendingWrites: false, fromCache: false } }); };
    window.claude = { use: async n => n === "db" ? { doc } : n === "comments" ? { canSendToClaude: async () => "available", anchorFor: async () => ({ path: "x", x: 0, y: 0 }),
      sendToClaude: async t => { window.__sent.push(t); return { threadId: "t", commentId: "c" }; } } : null };
  } });
  const ws = worldToScreen(p);

  await p.keyboard.press("b"); const q = await ws(156, 100); await p.mouse.click(q.x, q.y);
  await p.fill("#noteText", "Point plus petit"); await p.locator("#noteText").blur();
  await p.click("#sendAll"); await p.waitForFunction(() => __sent.length > 0 && __store["atelier/notes"], null, { timeout: 10000 }).catch(() => {});
  const sent = await p.evaluate(() => __sent);
  check("bubble sent to Claude with its layer", () => { assert.strictEqual(sent.length, 1); assert.match(JSON.stringify(sent[0]), /Point plus petit/); assert.match(JSON.stringify(sent[0]), /\[point\]/); });
  const notesSaved = await p.evaluate(() => !!__store["atelier/notes"]);
  check("notes stored in atelier/notes", () => assert.ok(notesSaved));

  // Claude recolours the dot and answers the bubble
  await p.evaluate(() => {
    const L = JSON.parse(__store["atelier/shape"] ? __store["atelier/shape"].data : JSON.stringify(__atelier.layers));
    L.find(l => l.id === "point").fill = "#000000"; delete L.find(l => l.id === "point").zone;
    __remote("atelier/shape", { data: JSON.stringify(L), at: Date.now() + 5000 });
    const N = JSON.parse(__store["atelier/notes"].data); N[0].reply = "Fait : rayon 16."; N[0].done = true;
    __remote("atelier/notes", { data: JSON.stringify(N), at: Date.now() + 5000 });
  });
  await p.waitForTimeout(2500);
  const st = await p.evaluate(() => [__atelier.layers.find(l => l.id === "point").fill, __atelier.notes[0].done, __atelier.notes[0].reply]);
  check("remote shape and reply applied", () => assert.deepStrictEqual(st, ["#000000", true, "Fait : rayon 16."]));
  await p.click("#notes .note"); await p.waitForTimeout(100);
  await p.screenshot({ path: __dirname + "/s5.png" });
  await p.click("#undo");
  const fillUndo = await p.evaluate(() => __atelier.layers.find(l => l.id === "point").fill);
  check("undo reverts Claude's remote change", () => assert.strictEqual(fillUndo, "#E0703A"));

  // export frames
  await p.click("#exportBtn");
  const boxes = {};
  for (const m of ["full", "mark", "word"]) { await p.check("input[value=" + m + "]"); boxes[m] = (await p.inputValue("#svgcode")).match(/viewBox="([^"]+)"/)[1]; }
  check("mark exported on its 256 square", () => assert.strictEqual(boxes.mark, "0 0 256 256"));
  check("full logo wider than the mark", () => assert.ok(+boxes.full.split(" ")[2] > 900, boxes.full));

  done(errors);
  await browser.close();
})();
