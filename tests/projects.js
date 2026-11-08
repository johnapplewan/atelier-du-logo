// Projects on this device: create, switch, collections, duplicate, copy layers between projects, files, reload safety.
const { chromium, assert, open, check, done } = require("./helpers");

(async () => {
  const browser = await chromium.launch();
  const { page: p, errors } = await open(browser, { init: () => {
    window.__files = [];
    window.claude = { use: async n => n === "downloads" ? { save: async ({ filename, data }) => { window.__files.push([filename, typeof data === "string" ? data : await data.text()]); return { status: "saved" }; } } : null };
  } });
  const projects = () => p.evaluate(async () => (await __projects.P.all()).map(x => ({ id: x.id, name: x.name, coll: x.collection, n: x.doc.layers.length })).sort((a, b) => a.name.localeCompare(b.name)));
  const cur = () => p.evaluate(() => __projects.current && __projects.current.id);
  const flush = () => p.evaluate(() => __projects.flush());

  // the drawing open at first launch becomes a project
  await p.waitForFunction(() => window.__projects && __projects.current);
  let list = await projects();
  check("first launch: one project holding the drawing", () => { assert.strictEqual(list.length, 1); assert.strictEqual(list[0].n, 9); assert.strictEqual(list[0].name, "Sans titre"); });

  // naming the brand names the project
  await p.click("#startBtn"); await p.fill("#stName", "Nova"); await p.click('[data-start="word"]'); await p.click("#stGo"); await p.waitForTimeout(400); await flush();
  const pill = await p.textContent("#projName");
  check("project named after the brand, shown in the header", () => assert.strictEqual(pill, "Nova"));
  const id1 = await cur();

  // collections
  await p.click("#projBtn"); await p.waitForSelector("#projGrid .pcard");
  await p.click("#collNew"); await p.waitForSelector("#projColls input.rename");
  await p.fill("#projColls input.rename", "DA Bois"); await p.press("#projColls input.rename", "Enter"); await p.waitForTimeout(300);
  const collId = await p.evaluate(() => [...document.querySelectorAll("#projColls [data-coll]")].find(b => /DA Bois/.test(b.textContent)).dataset.coll);
  await p.click('[data-coll="all"]'); await p.waitForTimeout(200);
  await p.selectOption(`[data-pcoll="${id1}"]`, collId); await p.waitForTimeout(300);
  list = await projects();
  check("project filed in a collection", () => assert.strictEqual(list[0].coll, collId));

  // new project inside the collection: the welcome dialog opens for it
  await p.click(`[data-coll="${collId}"]`); await p.waitForTimeout(200);
  await p.click("#projNew"); await p.waitForSelector("#startDlg[open]");
  await p.fill("#stName", "Second"); await p.click('[data-start="shape"]'); await p.click('[data-shape="hexagone"]'); await p.click("#stGo"); await p.waitForTimeout(500); await flush();
  list = await projects();
  const id2 = await cur();
  check("new project in the filtered collection", () => { assert.strictEqual(list.length, 2); const s = list.find(x => x.name === "Second"); assert.ok(s && s.coll === collId && s.n === 7, JSON.stringify(list)); assert.notStrictEqual(id1, id2); });

  // copy the hexagon, paste it into the first project
  await p.click('.layer[data-id="forme-depart"] .nm'); await p.keyboard.press("Control+c");
  await p.click("#projBtn"); await p.waitForSelector(`[data-open="${id1}"]`); await p.click(`.pact [data-open="${id1}"]`); await p.waitForTimeout(400);
  const back = await p.evaluate(() => [__projects.current.id, __atelier.layers.length, __atelier.layers.some(l => l.id === "forme-depart")]);
  check("switching projects loads the other drawing", () => assert.deepStrictEqual(back, [id1, 4, false]));
  await p.keyboard.press("Control+v"); await p.waitForTimeout(200);
  const pasted = await p.evaluate(() => __atelier.layers.filter(l => /^copie-/.test(l.id)).map(l => [l.name, l.subs[0].length, l.fill]));
  check("layer pasted from another project, same shape and colour", () => assert.deepStrictEqual(pasted, [["Hexagone", 6, "#22252B"]]));
  await p.keyboard.press("Control+z"); await p.waitForTimeout(100);
  const undone = await p.evaluate(() => __atelier.layers.some(l => /^copie-/.test(l.id)));
  check("paste undoable", () => assert.ok(!undone));

  // "Calques…" on a card: pick layers of another project
  await p.click("#projBtn"); await p.waitForSelector(`[data-takelayers="${id2}"]`); await p.click(`[data-takelayers="${id2}"]`);
  await p.waitForSelector("#projLayers .pllist input");
  await p.check('#projLayers .pllist input[value="forme-depart"]'); await p.click("#plAdd"); await p.waitForTimeout(200);
  const took = await p.evaluate(() => [document.querySelector("#projDlg").open, __atelier.layers.filter(l => /^copie-/.test(l.id)).length]);
  check("layers taken from a project card", () => assert.deepStrictEqual(took, [false, 1]));

  // duplicate
  await flush(); await p.click("#projBtn"); await p.waitForSelector(`[data-dup="${id1}"]`); await p.click(`[data-dup="${id1}"]`); await p.waitForTimeout(400);
  list = await projects();
  check("duplicate keeps the drawing and the collection", () => { const c = list.find(x => x.name === "Nova (copie)"); assert.ok(c && c.n === 5 && c.coll === collId, JSON.stringify(list)); });
  await p.screenshot({ path: __dirname + "/s11.png" });

  // search and filter
  await p.fill("#projFind", "second"); await p.waitForTimeout(200);
  const found = await p.$$eval("#projGrid .pcard", cs => cs.map(c => c.querySelector(".pname").value));
  check("search", () => assert.deepStrictEqual(found, ["Second"]));
  await p.fill("#projFind", "");

  // save the collection to a file, then open it again
  await p.click(`[data-coll="${collId}"]`); await p.waitForTimeout(200); await p.click("#projExport"); await p.waitForTimeout(400);
  const file = await p.evaluate(() => __files[__files.length - 1]);
  const parsed = JSON.parse(file[1]);
  check("collection saved to a .atelier.json file", () => { assert.match(file[0], /^da-bois\.atelier\.json$/); assert.strictEqual(parsed.projects.length, 3); assert.deepStrictEqual(parsed.collections.map(c => c.name), ["DA Bois"]); });
  await p.setInputFiles("#projOpenFile", { name: "da-bois.atelier.json", mimeType: "application/json", buffer: Buffer.from(file[1]) });
  await p.waitForTimeout(500);
  list = await projects();
  check("file opened: projects added as copies, same collection", () => { assert.strictEqual(list.length, 6); assert.ok(list.filter(x => / \(importé\)$/.test(x.name)).every(x => x.coll === collId)); });
  const colls = await p.evaluate(() => [...document.querySelectorAll("#projColls [data-coll]")].map(b => b.textContent.trim()));
  check("no duplicate collection on import", () => assert.strictEqual(colls.filter(t => /DA Bois/.test(t)).length, 1));

  // delete
  const dupId = (await projects()).find(x => x.name === "Nova (copie)").id;
  await p.click(`[data-coll="all"]`); await p.waitForTimeout(200); await p.click(`[data-del="${dupId}"]`); await p.click("#cfYes"); await p.waitForTimeout(400);
  list = await projects();
  check("delete a project", () => assert.ok(!list.some(x => x.id === dupId) && list.length === 5));
  await p.click("#projClose");

  // reload: same project, same drawing
  await p.waitForTimeout(1200); await p.reload(); await p.waitForFunction(() => window.__projects && __projects.current); await p.waitForTimeout(300);
  const after = await p.evaluate(() => [__projects.current.id, __atelier.layers.length]);
  check("reload reopens the current project", () => assert.deepStrictEqual(after, [id1, 5]));

  // the browser cache of the drawing is lost: the project's own copy is used, not the example
  await p.evaluate(() => { localStorage.removeItem("atelier-logo-v1"); localStorage.removeItem("atelier-logo-palette"); });
  await p.reload(); await p.waitForFunction(() => window.__projects && __projects.current); await p.waitForTimeout(300);
  const safe = await p.evaluate(() => [__projects.current.id, __atelier.layers.length, __atelier.layers.some(l => /^copie-/.test(l.id))]);
  check("drawing restored from the project when the cache is gone", () => assert.deepStrictEqual(safe, [id1, 5, true]));

  done(errors);
  await browser.close();
})();
