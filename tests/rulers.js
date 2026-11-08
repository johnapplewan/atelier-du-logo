// Rulers and draggable guides, guide magnetism, shortcuts directory, help texts on demand.
const { chromium, assert, open, worldToScreen, check, done } = require("./helpers");

(async () => {
  const browser = await chromium.launch();
  const { page: p, errors } = await open(browser);
  const ws = worldToScreen(p);

  // help texts hidden by default, tool hint flashes then fades
  const hidden = await p.evaluate(() => [document.body.classList.contains("nohelp"), getComputedStyle(document.querySelector(".help")).display]);
  check("help texts hidden by default", () => assert.deepStrictEqual(hidden, [true, "none"]));
  await p.keyboard.press("p"); const flash = await p.evaluate(() => document.querySelector("#hint").classList.contains("flash"));
  await p.waitForTimeout(3800); const faded = await p.evaluate(() => !document.querySelector("#hint").classList.contains("flash"));
  check("tool hint shown briefly on tool change", () => assert.ok(flash && faded));
  await p.keyboard.press("v");

  // shortcuts directory with "?", and help back on
  await p.keyboard.press("?"); await p.waitForSelector("#scDlg[open]");
  const sc = await p.evaluate(() => [document.querySelectorAll("#scList section").length, document.querySelectorAll("#scList kbd").length, /Plume : créer un tracé/.test(document.querySelector("#scList").textContent)]);
  check("shortcuts directory grouped, with keys", () => { assert.strictEqual(sc[0], 4); assert.ok(sc[1] > 30); assert.ok(sc[2]); });
  await p.check("#scHelp"); await p.click("#scClose");
  const shown = await p.evaluate(() => getComputedStyle(document.querySelector(".help")).display !== "none");
  check("'Afficher les aides à l'écran' brings help texts back", () => assert.ok(shown));

  // rulers with Ctrl+R
  await p.keyboard.press("Control+r");
  const rul = await p.evaluate(() => [!document.querySelector("#rulerTop").hidden, !document.querySelector("#rulerLeft").hidden, document.querySelector("#rulersOn").checked]);
  check("Ctrl+R shows the rulers", () => assert.deepStrictEqual(rul, [true, true, true]));

  // drag a horizontal guide from the top ruler to y = 128
  const rt = await p.locator("#rulerTop").boundingBox(), y128 = await ws(600, 128);
  await p.mouse.move(rt.x + 300, rt.y + 10); await p.mouse.down(); await p.mouse.move(rt.x + 300, y128.y, { steps: 6 }); await p.mouse.up();
  let g = await p.evaluate(() => guides.map(x => x.o + ":" + Math.round(x.v)));
  check("guide dropped from the top ruler", () => assert.deepStrictEqual(g, ["h:128"]));
  // a vertical one from the left ruler at x = 300
  const rl = await p.locator("#rulerLeft").boundingBox(), x300 = await ws(300, 300);
  await p.mouse.move(rl.x + 10, rl.y + 300); await p.mouse.down(); await p.mouse.move(x300.x, rl.y + 300, { steps: 6 }); await p.mouse.up();
  g = await p.evaluate(() => guides.map(x => x.o + ":" + Math.round(x.v)));
  check("guide dropped from the left ruler", () => assert.deepStrictEqual(g, ["h:128", "v:300"]));

  // magnetism: a pen point placed near the guides lands on them
  await p.check("#snapOn"); await p.keyboard.press("p");
  let q = await ws(302.5, 129.5); await p.mouse.click(q.x, q.y); q = await ws(420, 200); await p.mouse.click(q.x, q.y); await p.keyboard.press("Enter");
  const first = await p.evaluate(() => __atelier.layers[__atelier.layers.length - 1].subs[0][0]);
  check("points snap to guides", () => assert.deepStrictEqual([first.x, first.y], [300, 128]));
  await p.keyboard.press("v");

  // move a guide (Calque tool), then drag it back onto the ruler to remove it
  q = await ws(600, 128); const q2 = await ws(600, 160);
  await p.mouse.move(q.x, q.y); await p.mouse.down(); await p.mouse.move(q2.x, q2.y, { steps: 5 }); await p.mouse.up();
  g = await p.evaluate(() => guides.map(x => x.o + ":" + Math.round(x.v)));
  check("guide moved by dragging it", () => assert.deepStrictEqual(g, ["h:160", "v:300"]));
  await p.mouse.move(q2.x, q2.y); await p.mouse.down(); await p.mouse.move(q2.x, rt.y + 8, { steps: 6 }); await p.mouse.up();
  g = await p.evaluate(() => guides.map(x => x.o));
  check("guide dragged back onto the ruler is removed", () => assert.deepStrictEqual(g, ["v"]));
  await p.screenshot({ path: __dirname + "/s15.png" });

  // guides saved with the project
  await p.waitForTimeout(900); await p.reload(); await p.waitForTimeout(600);
  const kept = await p.evaluate(() => [guides.length, rulersOn]);
  check("guides and rulers kept after reload", () => assert.deepStrictEqual(kept, [1, true]));

  done(errors);
  await browser.close();
})();
