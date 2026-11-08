// My typefaces: import a TTF, duplicate a built-in typeface, create one, draw a glyph, export OTF, keep after reload.
const { chromium, assert, open, worldToScreen, check, done } = require("./helpers");
const fs = require("fs"), path = require("path");

(async () => {
  const browser = await chromium.launch();
  const { page: p, errors } = await open(browser, { context: { viewport: { width: 1400, height: 950 } }, init: () => {
    window.__files = [];
    window.claude = { use: async n => n === "downloads" ? { save: async ({ filename, data }) => { const b = new Uint8Array(await (data.arrayBuffer ? data : new Blob([data])).arrayBuffer()); window.__files.push([filename, Array.from(b.slice(0, 4)), b.length, b]); return { status: "saved" }; } } : null };
  } });
  const ws = worldToScreen(p);

  // open the manager from the F menu
  await p.click("#fontBtn"); await p.waitForSelector("#myFonts"); await p.click("#myFonts"); await p.waitForSelector("#fontDlg[open]");
  check("'Mes polices' opens from the F menu", () => {});

  // import a TTF (Instrument Serif, from the repo)
  await p.setInputFiles("#fmFile", { name: "instrument-serif-400.ttf", mimeType: "font/ttf", buffer: fs.readFileSync(path.join(__dirname, "../tools/fonts/ttf/instrument-serif-400.ttf")) });
  await p.waitForSelector("#fmEdit .fmgrid", { timeout: 20000 });
  const imp = await p.evaluate(() => { const cf = customFonts[0]; return { name: cf.name, glyphs: Object.keys(cf.G.gl).length, kern: Object.keys(cf.G.kern).length, cap: Math.round(cf.G.m.cap), upem: cf.G.upem }; });
  // 134 = the whole set except the space (no outline) and « Ÿ » (absent from this file)
  check("TTF imported: glyphs, kerning, metrics", () => { assert.strictEqual(imp.glyphs, 134, JSON.stringify(imp)); assert.ok(imp.kern > 10); assert.ok(imp.cap > 500 && imp.cap < 800); });
  await p.click("#fmUse"); await p.waitForTimeout(500);
  const used = await p.evaluate(() => [...new Set(__atelier.layers.filter(l => l.group === "word").map(l => l.font))]);
  check("imported typeface applied to the word", () => assert.ok(used.length === 1 && /^custom-/.test(used[0]), used.join()));
  const inMenu = await p.evaluate(async () => { await loadFonts(); return FONTS.filter(f => f.cat === "Mes polices").length; });
  check("listed in the F menu under 'Mes polices'", () => assert.strictEqual(inMenu, 1));

  // duplicate a built-in typeface into an editable copy
  await p.click("#fontBtn"); await p.click("#myFonts"); await p.waitForSelector("#fontDlg[open]");
  await p.selectOption("#fmDup", "montserrat"); await p.waitForFunction(() => customFonts.length === 2, null, { timeout: 15000 });
  const dup = await p.evaluate(() => [customFonts[1].name, Object.keys(customFonts[1].G.gl).length]);
  check("built-in typeface duplicated", () => { assert.match(dup[0], /Montserrat \(ma version\)/); assert.ok(dup[1] > 100); });

  // a blank typeface: draw the A with the pen in glyph mode
  await p.click("#fmNew"); await p.waitForFunction(() => customFonts.length === 3);
  const before = await p.evaluate(() => JSON.stringify(__atelier.layers.map(l => l.id)));
  await p.click('#fmEdit [data-glyph="A"]'); await p.waitForSelector("#glyphBar:not([hidden])");
  const gm = await p.evaluate(() => [document.querySelector("#glyphBar .gch").textContent, document.querySelector('[data-tool="pen"]').classList.contains("on"), __atelier.layers.length, document.querySelector("#exportBtn").disabled]);
  check("glyph mode: empty A, pen ready, guides, project tools set aside", () => assert.deepStrictEqual(gm, ["A", true, 0, true]));
  const guides = await p.evaluate(() => /ligne de base/.test(document.querySelector("#ovl").innerHTML));
  check("baseline and height guides shown", () => assert.ok(guides));
  // triangle: (0,0)=baseline left ... in font units: (40,0) (300,-700) (560,0)
  for (const [x, y] of [[40, 0], [300, -700], [560, 0], [40, 0]]) { const q = await ws(60 + x * 0.32, 380 + y * 0.32); await p.mouse.click(q.x, q.y); }
  await p.fill("#gbAdv", "600");
  await p.screenshot({ path: __dirname + "/s14.png" });
  await p.click("#gbDone"); await p.waitForSelector("#fontDlg[open]");
  const after = await p.evaluate(() => ({ ids: JSON.stringify(__atelier.layers.map(l => l.id)), gl: customFonts[2].G.gl.A || "", adv: customFonts[2].G.adv.A, exp: document.querySelector("#exportBtn").disabled }));
  check("glyph saved in font units", () => { assert.match(after.gl, /M\s*40 0/); assert.match(after.gl, /300 -700/); assert.strictEqual(after.adv, 600); });
  check("the project drawing is back untouched", () => { assert.strictEqual(after.ids, before); assert.ok(!after.exp); });

  // use it: word "AA" in the new typeface
  await p.click("#fmClose"); await p.fill("#txtIn", "AA"); await p.press("#txtIn", "Enter"); await p.waitForTimeout(400);
  await p.click("#fontBtn"); await p.click("#myFonts"); await p.click(`#fmList [data-fm="${await p.evaluate(() => customFonts[2].id)}"]`); await p.click("#fmUse"); await p.waitForTimeout(500);
  const aa = await p.evaluate(() => __atelier.layers.filter(l => l.group === "word").map(l => l.font + ":" + l.subs[0].length));
  check("word drawn with the home-made glyph", () => { assert.strictEqual(aa.length, 2); assert.ok(aa.every(x => /^custom-.*:3$/.test(x)), aa.join()); });

  // export OTF and read it back with opentype.js
  await p.click("#fontBtn"); await p.click("#myFonts"); await p.click("#fmOtf"); await p.waitForFunction(() => __files.some(f => /\.otf$/.test(f[0])), null, { timeout: 15000 });
  const otf = await p.evaluate(() => { const f = __files.find(f => /\.otf$/.test(f[0])); const font = opentype.parse(f[3].buffer); const g = font.charToGlyph("A");
    return { name: f[0], magic: String.fromCharCode(...f[1]), family: font.names.fontFamily.en, adv: g.advanceWidth, cmds: g.path.commands.length, upem: font.unitsPerEm }; });
  check("OTF exported and readable (family, A glyph, advance)", () => { assert.strictEqual(otf.magic, "OTTO"); assert.strictEqual(otf.adv, 600); assert.ok(otf.cmds >= 4); assert.match(otf.name, /\.otf$/); });
  await p.click("#fmClose");

  // kept on the device
  await p.waitForTimeout(800); await p.reload(); await p.waitForTimeout(800);
  const kept = await p.evaluate(async () => { await loadFonts(); return [customFonts.length, FONTS.filter(f => f.cat === "Mes polices").length, !!(customFonts[2] && customFonts[2].G.gl.A)]; });
  check("typefaces kept after reload", () => assert.deepStrictEqual(kept, [3, 3, true]));

  done(errors);
  await browser.close();
})();
