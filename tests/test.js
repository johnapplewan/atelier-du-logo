// Editing: example document, pen tool, undo/redo, bubbles, visibility, export, persistence, reset, fonts, touch.
const { chromium, assert, open, worldToScreen, layer, check, done } = require("./helpers");

(async () => {
  const browser = await chromium.launch();
  const { page: p, errors } = await open(browser);
  const ws = worldToScreen(p);

  // neutral example: frame, disc, dot + the word "Marque"
  const ids = await p.evaluate(() => __atelier.layers.map(l => l.id));
  check("example document", () => assert.deepStrictEqual(ids, ["cadre", "disque", "point", "lettre-1", "lettre-2", "lettre-3", "lettre-4", "lettre-5", "lettre-6"]));
  const word = await p.evaluate(() => __atelier.layers.filter(l => l.group === "word").map(l => l.ch).join(""));
  check("word is Marque, letters remember their character", () => assert.strictEqual(word, "Marque"));
  const rendered = await p.locator("#art path").count();
  check("all layers rendered", () => assert.strictEqual(rendered, 9));
  await p.screenshot({ path: __dirname + "/s1.png" });

  // pen: select the frame and move its first node (84,28) up by 14
  await p.keyboard.press("a");
  let q = await ws(45, 200); await p.mouse.click(q.x, q.y);
  const selLayer = (await p.evaluate(() => __atelier.sel)).layer;
  check("frame selected", () => assert.strictEqual(selLayer, "cadre"));
  q = await ws(84, 28); await p.mouse.move(q.x, q.y); await p.mouse.down();
  q = await ws(84, 14); await p.mouse.move(q.x, q.y, { steps: 5 }); await p.mouse.up();
  let L = (await layer(p, "cadre")).subs[0];
  check("node dragged", () => { assert.strictEqual(L.length, 8); assert.ok(Math.abs(L[0].x - 84) < 0.6 && Math.abs(L[0].y - 14) < 0.6, JSON.stringify(L[0])); });

  // add a node on the (now slanted) top edge, delete it, undo, redo
  q = await ws(128, 21); await p.mouse.click(q.x, q.y);
  const added = (await layer(p, "cadre")).subs[0].length;
  await p.keyboard.press("Delete");
  const deleted = (await layer(p, "cadre")).subs[0].length;
  await p.keyboard.press("Control+z"); const undone = (await layer(p, "cadre")).subs[0].length;
  await p.keyboard.press("Control+Shift+z"); const redone = (await layer(p, "cadre")).subs[0].length;
  check("add / delete / undo / redo node", () => assert.deepStrictEqual([added, deleted, undone, redone], [9, 8, 9, 8]));

  // bubble
  await p.keyboard.press("b"); q = await ws(90, 200); await p.mouse.click(q.x, q.y);
  await p.fill("#noteText", "Arrondir le cadre"); await p.locator("#noteText").blur(); await p.waitForTimeout(700);
  const notes = await p.evaluate(() => __atelier.notes.map(n => [n.n, n.text]));
  check("bubble saved", () => assert.deepStrictEqual(notes, [[1, "Arrondir le cadre"]]));

  // visibility
  await p.locator('.layer[data-id="lettre-1"] [data-act=vis]').click();
  const hidden = !(await layer(p, "lettre-1")).visible;
  await p.locator('.layer[data-id="lettre-1"] [data-act=vis]').click();
  check("hide / show a letter", () => assert.ok(hidden));

  // export: names and title come from the word (no brand entered yet)
  await p.click("#exportBtn"); await p.check("input[value=full]");
  const svg = await p.inputValue("#svgcode"), save = await p.textContent("#exSave");
  check("export title and paths", () => { assert.match(svg, /<title>Marque<\/title>/); assert.strictEqual((svg.match(/<path/g) || []).length, 9); });
  check("export file name from the word", () => assert.match(save, /marque-logo\.svg/));
  await p.click("#exClose");

  // persistence, with neutral keys only
  await p.waitForTimeout(800); await p.reload(); await p.waitForTimeout(500);
  const keys = await p.evaluate(() => Object.keys(localStorage));
  const after = await p.evaluate(() => [__atelier.notes.length, __atelier.layers.find(l => l.id === "cadre").subs[0][0]]);
  check("reload keeps notes and curves", () => { assert.strictEqual(after[0], 1); assert.ok(Math.abs(after[1].y - 14) < 0.6); });
  check("neutral localStorage keys", () => { assert.ok(keys.includes("atelier-logo-v1"), keys.join()); assert.ok(!keys.some(k => /simulimmo/i.test(k)), keys.join()); });

  // back to the example through "Marque et départ"
  await p.click("#startBtn"); await p.fill("#stName", "Atelier Nova"); await p.click('[data-start="example"]'); await p.click("#stGo"); await p.waitForTimeout(500);
  const reset0 = (await layer(p, "cadre")).subs[0][0];
  check("reset", () => assert.deepStrictEqual(reset0, { x: 84, y: 28, i: { x: 53.07, y: 28 }, o: null }));

  // fonts: previews show the user's word, whole-word and per-letter swaps
  await p.fill("#txtIn", "Atelier Nova"); await p.press("#txtIn", "Enter"); await p.waitForTimeout(400);
  const w2 = await p.evaluate(() => __atelier.layers.filter(l => l.group === "word").map(l => l.ch).join(""));
  check("typed word re-shaped", () => assert.strictEqual(w2, "AtelierNova"));
  await p.click("#fontBtn"); await p.waitForSelector("#fontMenu .fontitem svg", { timeout: 5000 });
  const prevLetters = await p.evaluate(() => document.querySelector('#fontMenu .fontitem svg').querySelectorAll("path").length);
  check("font preview draws the typed word", () => assert.strictEqual(prevLetters, 11));
  const mont = await p.evaluate(() => [...document.querySelectorAll("#fontMenu .fontitem")].findIndex(b => b.querySelector(".fn").textContent.trim() === "Montserrat"));
  await p.locator("#fontMenu .fontitem").nth(mont).click(); await p.waitForTimeout(600);
  const fonts = await p.evaluate(() => [...new Set(__atelier.layers.filter(l => l.group === "word").map(l => l.font))]);
  check("whole word in Montserrat", () => assert.deepStrictEqual(fonts, ["montserrat"]));
  // per letter: select the first two letters, apply Playfair Display
  await p.click("#fontBtn");
  await p.click('.layer[data-id="lettre-1"] .nm'); await p.click('.layer[data-id="lettre-2"] .nm', { modifiers: ["Shift"] });
  await p.click("#fontBtn"); await p.waitForTimeout(200);
  await p.check("input[name=fscope][value=sel]");
  const play = await p.evaluate(() => [...document.querySelectorAll("#fontMenu .fontitem")].findIndex(b => b.querySelector(".fn").textContent.trim() === "Playfair Display"));
  await p.locator("#fontMenu .fontitem").nth(play).click(); await p.waitForTimeout(600);
  const per = await p.evaluate(() => __atelier.layers.filter(l => l.group === "word").map(l => l.font + ":" + l.ch));
  check("per-letter swap on any word", () => assert.deepStrictEqual(per.slice(0, 3), ["playfair:A", "playfair:t", "montserrat:e"]));
  await p.click("#exportBtn"); await p.check("input[value=full]");
  const save2 = await p.textContent("#exSave");
  check("export name follows the brand name", () => assert.match(save2, /atelier-nova-logo\.svg/));
  await p.click("#exClose");

  // delete layers: right click in the list, confirmation, undo; Suppr with the Calque tool
  await p.click('.layer[data-id="point"] .nm', { button: "right" }); await p.waitForSelector("#confirmDlg[open]");
  const askTxt = await p.textContent("#cfTitle"); await p.click("#cfNo");
  const stillThere = await p.evaluate(() => __atelier.layers.some(l => l.id === "point"));
  check("right click asks before deleting; Annuler keeps the layer", () => { assert.match(askTxt, /Supprimer « Point » \?/); assert.ok(stillThere); });
  await p.click('.layer[data-id="point"] .nm', { button: "right" }); await p.click("#cfYes"); await p.waitForTimeout(100);
  const gone = await p.evaluate(() => !__atelier.layers.some(l => l.id === "point"));
  await p.keyboard.press("Control+z"); const back = await p.evaluate(() => __atelier.layers.some(l => l.id === "point"));
  check("layer deleted after confirmation, undo brings it back", () => assert.ok(gone && back));
  await p.keyboard.press("v"); await p.click('.layer[data-id="disque"] .nm'); await p.focus("body"); await p.keyboard.press("Delete"); await p.click("#cfYes"); await p.waitForTimeout(100);
  const delKey = await p.evaluate(() => !__atelier.layers.some(l => l.id === "disque")); await p.keyboard.press("Control+z");
  check("Suppr deletes the selected layer (Calque tool)", () => assert.ok(delKey));

  // "À propos": project, author, support buttons only when configured
  await p.click("#aboutBtn");
  const ab = await p.evaluate(() => [document.querySelector("#aboutDlg").open, /éditeur vectoriel/.test(document.querySelector("#aboutDlg").textContent), document.querySelector("#abSupport").innerHTML]);
  check("about: presentation, contact link and PayPal button", () => { assert.ok(ab[0] && ab[1]); assert.match(ab[2], /paypal\.com\/donate/); });
  const mail = await p.getAttribute("#abBio a.contact", "href");
  check("about: contact e-mail as a mailto link", () => assert.strictEqual(mail, "mailto:contact.johnapple.fr@gmail.com"));
  // Wero as build.js encodes it: "~" + base64 of the reversed number, shown only after a click
  await p.evaluate(() => { setAbout({ paypal: "https://www.paypal.com/paypalme/exemple", wero: "~" + btoa("06 00 00 00 12".split("").reverse().join("")) }); renderAbout(); });
  const sup = await p.evaluate(() => [document.querySelector("#abSupport a.paypal").getAttribute("href"), /12/.test(document.querySelector("#abSupport").textContent)]);
  await p.click("#abWeroShow"); const shown = await p.textContent("#abWeroVal");
  check("about: PayPal link; Wero number hidden until « Afficher le numéro »", () => { assert.deepStrictEqual(sup, ["https://www.paypal.com/paypalme/exemple", false]); assert.strictEqual(shown, "06 00 00 00 12"); });
  await p.click("#abClose");

  // Texte tool: the block is text (not symbol), exports with the word, and takes a typeface letter by letter
  await p.keyboard.press("t"); q = await ws(60, 330); await p.mouse.click(q.x, q.y); await p.waitForTimeout(600);
  await p.fill("#txtIn", "Studio"); await p.press("#txtIn", "Enter"); await p.waitForTimeout(600);
  const blk = await p.evaluate(() => __atelier.layers.filter(l => l.grp && /^txt/.test(l.grp)).map(l => [l.id, l.group]));
  check("text block filed as text, not symbol", () => { assert.strictEqual(blk.length, 6); assert.ok(blk.every(x => x[1] === "word"), JSON.stringify(blk)); });
  await p.click(`.layer[data-id="${blk[0][0]}"] .nm`); await p.click("#fontBtn"); await p.waitForSelector("#fontMenu .fontitem");
  const sc = await p.evaluate(() => document.querySelector("input[name=fscope]:checked").value);
  const mt = await p.evaluate(() => [...document.querySelectorAll("#fontMenu .fontitem")].findIndex(x => x.querySelector(".fn").textContent.trim() === "Montserrat"));
  await p.locator("#fontMenu .fontitem").nth(mt).click(); await p.waitForTimeout(600);
  const bf = await p.evaluate(() => __atelier.layers.filter(l => l.grp && /^txt/.test(l.grp)).map(l => l.font));
  check("one letter of a text block changes typeface alone", () => { assert.strictEqual(sc, "sel"); assert.strictEqual(bf[0], "montserrat"); assert.ok(bf.slice(1).every(f => f !== "montserrat"), bf.join()); });
  await p.click("#exportBtn"); await p.check("input[name=exm][value=mark]"); const mk = await p.inputValue("#svgcode"); await p.check("input[name=exm][value=word]"); const wd = await p.inputValue("#svgcode"); await p.click("#exClose");
  check("export: the symbol without the text, the text with the word", () => { assert.ok(!/Studio|txt/.test(mk) && (mk.match(/<path/g) || []).length < (wd.match(/<path/g) || []).length); });

  // tablet: tap a node and drag it by touch
  const { ctx: tctx, page: tp, errors: terr } = await open(browser, { context: { viewport: { width: 1024, height: 1366 }, hasTouch: true, isMobile: true } });
  const tws = worldToScreen(tp);
  await tp.locator("[data-tool=points]").tap();
  q = await tws(45, 200); await tp.touchscreen.tap(q.x, q.y);
  q = await tws(84, 28);
  const cdp = await tctx.newCDPSession(tp);
  const touch = (type, x, y) => cdp.send("Input.dispatchTouchEvent", { type, touchPoints: type === "touchEnd" ? [] : [{ x, y }] });
  await touch("touchStart", q.x, q.y); for (let i = 1; i <= 5; i++) await touch("touchMove", q.x, q.y - i * 4); await touch("touchEnd");
  const tnode = (await layer(tp, "cadre")).subs[0][0];
  check("touch drag moves a node", () => assert.ok(tnode.y < 27, JSON.stringify(tnode)));
  await tp.screenshot({ path: __dirname + "/s4.png" });

  done(errors.concat(terr));
  await browser.close();
})();
