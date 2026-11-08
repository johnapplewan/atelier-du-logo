// Project history: long press on "Annuler", uncheck / recheck any change, "only this one" vs "this one and the next".
const { chromium, assert, open, check, done } = require("./helpers");

(async () => {
  const browser = await chromium.launch();
  const { page: p, errors } = await open(browser);
  const st = () => p.evaluate(() => { const g = id => __atelier.layers.find(l => l.id === id); return { disque: g("disque").subs[0][0].x, point: g("point").subs[0][0].y, fx: (g("disque").fx || []).map(e => e.t).join() }; });
  const sel = async id => { await p.click(`.layer[data-id="${id}"] .nm`); await p.click("#cv", { position: { x: 5, y: 5 }, trial: true }).catch(() => {}); };
  const s0 = await st();

  // three changes: move the disc, move the dot, shadow on the disc
  await sel("disque"); await p.focus("body"); await p.keyboard.press("ArrowRight");
  await sel("point"); await p.keyboard.press("ArrowDown");
  await sel("disque"); await p.selectOption("#styleSel", "fx:ombre"); await p.waitForTimeout(150);
  const s1 = await st();
  check("three changes made", () => { assert.strictEqual(s1.disque, s0.disque + 1); assert.strictEqual(s1.point, s0.point + 1); assert.strictEqual(s1.fx, "ombre"); });

  // long press opens the history
  const ub = await p.locator("#undo").boundingBox();
  await p.mouse.move(ub.x + ub.width / 2, ub.y + ub.height / 2); await p.mouse.down(); await p.waitForTimeout(650); await p.mouse.up();
  const panel = await p.isVisible("#histPanel");
  const labels = await p.$$eval("#histList .hl", els => els.map(e => e.textContent));
  check("long press on Annuler opens the history (newest first, labelled)", () => { assert.ok(panel); assert.deepStrictEqual(labels, ["Style « Ombre portée »", "Forme · « Point »", "Forme · « Disque »"]); });
  const sAfterPress = await st();
  check("the long press does not undo", () => assert.deepStrictEqual(sAfterPress, s1));

  // hover shows what an entry touched
  await p.hover('#histList li:nth-child(3)');
  const hi = await p.evaluate(() => document.querySelector("#histHi").children.length);
  check("hovering an entry outlines its layers", () => assert.strictEqual(hi, 1));

  // uncheck the oldest change only: the disc goes back, the shadow and the dot stay
  await p.uncheck('#histList li:nth-child(3) input'); await p.waitForSelector("#choiceDlg[open]");
  const q = await p.$$eval("#chBtns button", bs => bs.map(b => b.textContent));
  check("confirmation offers 'only this one' or 'this one and the next'", () => assert.deepStrictEqual(q, ["Seulement cette modification", "Celle-ci et les 2 suivantes", "Annuler"]));
  await p.click('#chBtns [data-ch="one"]'); await p.waitForTimeout(150);
  let s = await st();
  check("only this change undone, later ones kept", () => assert.deepStrictEqual(s, { disque: s0.disque, point: s0.point + 1, fx: "ombre" }));
  const struck = await p.evaluate(() => document.querySelector("#histList li:nth-child(3)").classList.contains("off"));
  check("unchecked entry shown struck through", () => assert.ok(struck));

  // recheck it
  await p.check('#histList li:nth-child(3) input'); await p.waitForTimeout(150);
  s = await st();
  check("rechecking brings it back", () => assert.deepStrictEqual(s, s1));

  // uncheck the dot move with the following ones
  await p.uncheck('#histList li:nth-child(2) input'); await p.waitForSelector("#choiceDlg[open]");
  await p.click('#chBtns [data-ch="after"]'); await p.waitForTimeout(150);
  s = await st();
  check("'this one and the next' undoes the dot and the shadow, keeps the first move", () => assert.deepStrictEqual(s, { disque: s0.disque + 1, point: s0.point, fx: "" }));
  // cancel in the confirmation changes nothing
  await p.uncheck('#histList li:nth-child(3) input'); await p.waitForSelector("#choiceDlg[open]").catch(() => {});
  const asked = await p.evaluate(() => document.querySelector("#choiceDlg").open);
  if (asked) await p.click('#chBtns [data-ch="cancel"]');
  await p.waitForTimeout(150);
  const s2 = await st(), still = await p.isChecked('#histList li:nth-child(3) input');
  // (the two later entries are off, so no question is needed: it is undone directly)
  check("unchecking the last active change needs no question", () => { assert.ok(!asked); assert.ok(!still); assert.strictEqual(s2.disque, s0.disque); });
  await p.check('#histList li:nth-child(3) input'); await p.waitForTimeout(100);
  await p.click("#histClose");

  // conflict: two moves of the same layer; unchecking the first keeps the later position
  await sel("point"); await p.keyboard.press("ArrowLeft"); await p.keyboard.press("ArrowLeft");
  const twice = await p.evaluate(() => __atelier.layers.find(l => l.id === "point").subs[0][0].x);
  await p.click("#histBtn"); await p.uncheck('#histList li:nth-child(2) input'); await p.waitForSelector("#choiceDlg[open]"); await p.click('#chBtns [data-ch="one"]'); await p.waitForTimeout(150);
  const after = await p.evaluate(() => [__atelier.layers.find(l => l.id === "point").subs[0][0].x, document.querySelector("#toast").textContent]);
  check("a property changed again later is kept, and the user is told", () => { assert.strictEqual(after[0], twice); assert.match(after[1], /Point/); });
  await p.click("#histClose");

  // Ctrl+Z switches off the latest active change, Ctrl+Maj+Z brings it back
  const n0 = await p.evaluate(() => __atelier.layers.find(l => l.id === "point").subs[0][0].x);
  await p.keyboard.press("Control+z"); const n1 = await p.evaluate(() => __atelier.layers.find(l => l.id === "point").subs[0][0].x);
  await p.keyboard.press("Control+Shift+z"); const n2 = await p.evaluate(() => __atelier.layers.find(l => l.id === "point").subs[0][0].x);
  check("Ctrl+Z / Ctrl+Maj+Z", () => { assert.strictEqual(n1, n0 + 1); assert.strictEqual(n2, n0); });

  // right click also opens it; the history is saved with the project
  await p.click("#undo", { button: "right" });
  const rc = await p.isVisible("#histPanel"); await p.click("#histClose");
  check("right click opens the history", () => assert.ok(rc));
  await p.evaluate(() => __projects.flush()); await p.waitForTimeout(900); await p.reload(); await p.waitForFunction(() => window.__projects && __projects.current); await p.waitForTimeout(300);
  await p.click("#histBtn");
  const kept = await p.$$eval("#histList li", ls => ls.map(l => (l.classList.contains("off") ? "-" : "+") + l.querySelector(".hl").textContent));
  check("history kept with the project after reload (with unchecked entries)", () => { assert.strictEqual(kept.length, 5); assert.ok(kept.some(x => x.startsWith("-")), kept.join(" | ")); });

  done(errors);
  await browser.close();
})();
