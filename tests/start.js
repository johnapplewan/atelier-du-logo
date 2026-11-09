// First open (brand + starting point), image import / vectorisation, pattern export.
const { chromium, assert, open, check, done } = require("./helpers");

// A fake photo of a drawing: yellowish paper with a light gradient (shadow), grain, an ink ring and a thin wavy stroke.
const drawPhoto = ({ w, h, ring, wave, dark }) => {
  const c = document.createElement("canvas"); c.width = w; c.height = h; const g = c.getContext("2d");
  const grd = g.createLinearGradient(0, 0, w, h); grd.addColorStop(0, dark ? "#202020" : "#F4EEDC"); grd.addColorStop(1, dark ? "#151515" : "#B9B29E");
  g.fillStyle = grd; g.fillRect(0, 0, w, h);
  let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < w * h / 40; i++) { g.fillStyle = `rgba(${dark ? 255 : 0},${dark ? 255 : 0},${dark ? 255 : 0},${0.05 + rnd() * 0.08})`; g.fillRect(rnd() * w, rnd() * h, 1.5, 1.5); }
  const ink = dark ? "#EDEDED" : "#1B2A6B";
  if (ring) { g.strokeStyle = ink; g.lineWidth = 34; g.beginPath(); g.arc(w * 0.32, h * 0.5, Math.min(w, h) * 0.24, 0, 2 * Math.PI); g.stroke(); }
  if (wave) { g.strokeStyle = ink; g.lineWidth = 4; g.beginPath(); for (let x = w * 0.6; x < w * 0.95; x += 2) g.lineTo(x, h * 0.5 + Math.sin(x / 18) * h * 0.12); g.stroke(); }
  return c.toDataURL("image/png").split(",")[1];
};
const photo = async (p, o) => ({ name: "dessin.png", mimeType: "image/png", buffer: Buffer.from(await p.evaluate(drawPhoto, o), "base64") });
const area = sub => { let a = 0; for (let i = 0; i < sub.length; i++) { const q = sub[i], r = sub[(i + 1) % sub.length]; a += q.x * r.y - r.x * q.y; } return a / 2; };

(async () => {
  const browser = await chromium.launch();

  // 1. fresh open: the welcome dialog asks for the brand
  const { page: p, errors } = await open(browser, { welcome: true });
  const shown = await p.isVisible("#startDlg");
  const keepHidden = await p.isHidden("#stKeep");
  check("welcome dialog on first open", () => assert.ok(shown));
  check("no 'keep' choice on the untouched example", () => assert.ok(keepHidden));
  await p.click("#stGo");
  const msg = await p.textContent("#stMsg");
  check("brand name is required", () => assert.match(msg, /nom de la marque/));

  // "the name alone"
  await p.fill("#stName", "Atelier Nova"); await p.fill("#stTag", "Des meubles qui durent"); await p.fill("#stKw", "bois, artisanal ,  minimal");
  await p.click('[data-start="word"]'); await p.click("#stGo"); await p.waitForTimeout(600);
  let st = await p.evaluate(() => ({ ids: __atelier.layers.map(l => l.group + ":" + (l.ch || l.id)), open: document.querySelector("#startDlg").open }));
  check("start with the name alone", () => { assert.ok(!st.open); assert.deepStrictEqual(st.ids.join(" "), "word:A word:t word:e word:l word:i word:e word:r word:N word:o word:v word:a"); });
  await p.click("#exportBtn"); const save = await p.textContent("#exSave"); await p.click("#exClose");
  check("exports named after the brand", () => assert.match(save, /atelier-nova-logo\.svg/));
  await p.keyboard.press("Control+z"); await p.waitForTimeout(200);
  const undone = await p.evaluate(() => __atelier.layers.map(l => l.id));
  check("the start is one undo step", () => assert.deepStrictEqual(undone.slice(0, 3), ["cadre", "disque", "point"]));
  await p.keyboard.press("Control+Shift+z");

  // brand kept across reloads, dialog not shown again
  await p.waitForTimeout(900); await p.reload(); await p.waitForTimeout(600);
  const again = await p.evaluate(() => [document.querySelector("#startDlg").open, __atelier.layers.length]);
  check("brand saved, no welcome after reload", () => assert.deepStrictEqual(again, [false, 11]));

  // reopen: shape + name, then blank page
  await p.click("#startBtn");
  const pre = await p.evaluate(() => [document.querySelector("#stName").value, document.querySelector("#stKw").value, !document.querySelector("#stKeep").hidden]);
  check("dialog reopens with the brand, keywords and a 'keep' choice", () => assert.deepStrictEqual(pre, ["Atelier Nova", "bois, artisanal, minimal", true]));
  await p.click('[data-start="shape"]'); await p.click('[data-shape="arche"]'); await p.click("#stGo"); await p.waitForTimeout(600);
  st = await p.evaluate(() => __atelier.layers.map(l => l.id));
  check("shape + name", () => { assert.strictEqual(st[0], "forme-depart"); assert.strictEqual(st.length, 12); });
  const wx = await p.evaluate(() => Math.min(...__atelier.layers.filter(l => l.group === "word").flatMap(l => l.subs.flat().map(n => n.x))));
  check("name placed right of the shape", () => assert.ok(wx > 280, String(wx)));
  // logo concepts from keywords and key letters
  await p.click("#startBtn"); await p.fill("#stKw", "bois, cerf, ébénisterie, menuiserie, artisanale"); await p.fill("#stLet", "an");
  await p.click('[data-start="proposal"]');
  await p.waitForSelector("#stProps [data-prop] svg", { timeout: 20000 });
  const props = await p.evaluate(() => ({ titles: [...document.querySelectorAll("#stProps [data-prop] b")].map(b => b.textContent), found: document.querySelector("#stProps p").textContent }));
  check("nine concepts: five premium layouts, then illustrated ones", () => { assert.strictEqual(props.titles.length, 9); assert.match(props.found, /cerf/); assert.match(props.found, /matière : bois/);
    assert.deepStrictEqual(props.titles.slice(0, 5), ["Signature empilée", "Monogramme encadré", "Emblème à double filet", "Logotype à détail", "Version sombre"]);
    assert.ok(props.titles.some(t => /^Cerf .*nom en dessous/.test(t)) && props.titles.some(t => /^Écusson/.test(t)), props.titles.join(" | ")); });
  // the whole catalogue for this brief: 36 premium layouts + illustrated ones (styles, seals, emblems, plank…)
  const all = await p.evaluate(async () => { const info = startInfo(), C = conceptPlan.counts, titles = new Set(); const n = Math.ceil(Math.max(C.premium / 5, C.illus / 4));
    for (let r = 0; r < n; r++) for (const pl of conceptPlan(info, r).plans) titles.add(pl.title); return { C, titles: [...titles], series: document.querySelector("#stSeries").textContent }; });
  check("more than 60 proposals for this brief, all different", () => { assert.ok(all.C.premium + all.C.illus >= 60, JSON.stringify(all.C)); assert.ok(all.titles.length >= 55, String(all.titles.length));
    assert.ok(all.titles.includes("Planche gravée") && all.titles.includes("Sceau, nom en cercle") && all.titles.some(t => /^Demi-cerf/.test(t)), all.titles.join(" | ")); assert.match(all.series, /propositions · série 1 sur/); });
  await p.locator("#startDlg").screenshot({ path: __dirname + "/s10.png" });
  const esc = props.titles.findIndex(t => /^Écusson/.test(t));
  await p.click(`#stProps [data-prop="${esc}"]`); await p.click("#stGo"); await p.waitForTimeout(600);
  const pr = await p.evaluate(() => ({ ids: __atelier.layers.map(l => l.id), word: __atelier.layers.filter(l => l.group === "word").map(l => l.ch).join(""),
    deer: __atelier.layers.filter(l => l.grp).length, fills: [...new Set(__atelier.layers.map(l => l.fill))] }));
  check("concept applied: escutcheon, stylised deer in its own group, name", () => { assert.strictEqual(pr.ids[0], "ecusson"); assert.ok(pr.deer >= 3, String(pr.deer)); assert.strictEqual(pr.word.toLowerCase(), "ateliernova"); });
  check("concept colours from the material (wood)", () => assert.ok(pr.fills.includes("#8B5A2B"), pr.fills.join()));
  await p.click("#startBtn"); await p.click('[data-start="proposal"]'); await p.waitForSelector("#stProps [data-prop] svg");
  const r0 = await p.evaluate(() => document.querySelector("#stProps").textContent); await p.click("#stMore"); await p.waitForTimeout(1500);
  const r1 = await p.evaluate(() => document.querySelector("#stProps").textContent);
  check("'Autres concepts' changes the set", () => assert.notStrictEqual(r0, r1));
  const letKept = await p.inputValue("#stLet");
  check("key letters saved with the brand", () => assert.strictEqual(letKept, "an"));
  // a subject outside the pictogram library: placeholder + bubble brief for Claude
  await p.fill("#stKw", "loutre, rivière"); await p.waitForTimeout(400); await p.waitForFunction(() => /loutre/.test(document.querySelector("#stProps").textContent), null, { timeout: 15000 });
  const ph = await p.evaluate(() => [...document.querySelectorAll("#stProps [data-prop] b")].findIndex(b => /^Signature empilée$|^Loutre /.test(b.textContent)));
  await p.click(`#stProps [data-prop="${Math.max(0, ph)}"]`); await p.click("#stGo"); await p.waitForTimeout(500);
  const brief = await p.evaluate(() => ({ ph: __atelier.layers.some(l => l.id === "motif-provisoire"), note: (__atelier.notes.find(n => /loutre/.test(n.text)) || {}).text || "" }));
  check("unknown subject: placeholder and a bubble brief for Claude (premium rules)", () => { assert.ok(brief.ph); assert.match(brief.note, /dessine le motif « loutre »/); });

  // blank page: a plain link next to "Plus tard"
  await p.click("#startBtn");
  const tag = await p.evaluate(() => document.querySelector("#stBlank").tagName);
  check("'Page vierge' is a link", () => assert.strictEqual(tag, "A"));
  await p.click("#stBlank"); await p.waitForTimeout(400);
  const blank = await p.evaluate(() => __atelier.layers.length);
  check("blank page", () => assert.strictEqual(blank, 0));
  await p.fill("#txtIn", "Nova"); await p.press("#txtIn", "Enter"); await p.waitForTimeout(500);
  const typed = await p.evaluate(() => __atelier.layers.map(l => l.ch).join(""));
  check("typing on a blank page creates the word", () => assert.strictEqual(typed, "Nova"));

  // 2. import: file picker, cleaning, tracing
  await p.click("#importBtn");
  await p.setInputFiles("#impFile", await photo(p, { w: 800, h: 520, ring: true, wave: true }));
  await p.waitForFunction(() => __vec.imp.res, null, { timeout: 10000 });
  let r = await p.evaluate(() => { const x = __vec.imp.res; return { subs: x.subs.map(s => s.length), nodes: x.nodes, ink: x.ink, areas: x.subs.map(s => { let a = 0; for (let i = 0; i < s.length; i++) { const q = s[i], t = s[(i + 1) % s.length]; a += q.x * t.y - t.x * q.y; } return a / 2; }) }; });
  check("paper, shadow and grain removed: ring (outer + hole) and stroke only", () => assert.strictEqual(r.subs.length, 3, JSON.stringify(r.subs)));
  check("hole wound the other way (stays open)", () => { const s = r.areas.map(Math.sign); assert.ok(s.includes(1) && s.includes(-1), JSON.stringify(r.areas)); });
  check("editable number of points", () => assert.ok(r.nodes > 12 && r.nodes < 400, String(r.nodes)));
  check("ink colour detected (dark blue)", () => { const [R, G, B] = [1, 3, 5].map(i => parseInt(r.ink.slice(i, i + 2), 16)); assert.ok(B > R + 15 && B > G && R < 110, r.ink); });
  await p.screenshot({ path: __dirname + "/s8.png" });
  // more detail -> more points; more cleaning drops the thin stroke when it is small
  await p.evaluate(() => { const el = document.querySelector('[data-io="detail"]'); el.value = 100; el.dispatchEvent(new Event("input", { bubbles: true })); });
  await p.waitForTimeout(400);
  const nodes2 = await p.evaluate(() => __vec.imp.res.nodes);
  check("Détail adds points", () => assert.ok(nodes2 > r.nodes, nodes2 + " vs " + r.nodes));
  await p.click("#impAdd"); await p.waitForTimeout(300);
  const added = await p.evaluate(() => { const L = __atelier.layers[__atelier.layers.length - 1]; const xs = L.subs.flat().map(n => n.x), ys = L.subs.flat().map(n => n.y);
    return { id: L.id, name: L.name, subs: L.subs.length, box: [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)].map(Math.round) }; });
  check("vectorised layer added in the symbol area", () => { assert.match(added.id, /^image-/); assert.strictEqual(added.subs, 3); assert.ok(added.box[0] >= 27 && added.box[1] >= 27 && added.box[3] <= 229, JSON.stringify(added.box)); });
  await p.keyboard.press("Control+z");
  const afterUndo = await p.evaluate(() => __atelier.layers.some(l => /^image-/.test(l.id)));
  check("import undoable", () => assert.ok(!afterUndo));

  // signature (thin stroke), light on dark with Inverser
  await p.click("#importBtn"); await p.click('[data-mode="thin"]');
  await p.setInputFiles("#impCam", await photo(p, { w: 900, h: 300, wave: true, dark: true }));
  await p.waitForTimeout(300);
  let inv = await p.evaluate(() => __vec.imp.res && __vec.imp.res.subs.length);
  await p.check('[data-io="invert"]'); await p.waitForTimeout(400);
  const sig = await p.evaluate(() => ({ subs: __vec.imp.res.subs.length, nodes: __vec.imp.res.nodes }));
  check("light-on-dark signature needs Inverser, then traces as one stroke", () => { assert.strictEqual(sig.subs, 1, JSON.stringify(sig)); assert.ok(inv !== 1); });
  const camAttr = await p.getAttribute("#impCam", "capture");
  check("'Prendre une photo' opens the camera on tablets", () => assert.strictEqual(camAttr, "environment"));
  await p.click("#impCancel");

  // 3. pattern: tile import keeps the frame, exported as a repeat cell
  await p.click("#importBtn"); await p.click('[data-mode="fill"]'); await p.uncheck('[data-io="invert"]');
  await p.setInputFiles("#impFile", await photo(p, { w: 400, h: 400, ring: true }));
  await p.waitForTimeout(400); await p.check('[data-io="tile"]'); await p.waitForTimeout(200); await p.click("#impAdd"); await p.waitForTimeout(300);
  const tile = await p.evaluate(() => __atelier.layers[__atelier.layers.length - 1].tile);
  check("tile frame kept", () => assert.deepStrictEqual(tile, { x: 28, y: 28, w: 200, h: 200 }));
  await p.click("#exportBtn"); await p.check("input[name=exm][value=pattern]");
  let psvg = await p.inputValue("#svgcode"), pname = await p.textContent("#exSave");
  check("pattern tile = the image frame", () => { assert.match(psvg, /viewBox="28 28 200 200"/); assert.strictEqual((psvg.match(/<use /g) || []).length, 9); assert.match(pname, /atelier-nova-motif\.svg/); });
  await p.selectOption("#exPatLay", "brick"); psvg = await p.inputValue("#svgcode");
  check("quinconce doubles the cell height", () => { assert.match(psvg, /viewBox="28 28 200 400"/); assert.strictEqual((psvg.match(/<use /g) || []).length, 18); });
  const prevOK = await p.evaluate(() => new Promise(ok => { const i = document.querySelector("#exPrev"); if (i.complete && i.naturalWidth) ok(i.naturalWidth); else { i.onload = () => ok(i.naturalWidth); i.onerror = () => ok(0); } }));
  check("mosaic preview renders", () => assert.ok(prevOK > 0));
  await p.screenshot({ path: __dirname + "/s9.png" });
  const png = await p.evaluate(async () => { const b = await (async () => { const s = document.querySelector("#svgcode").value; const m = /viewBox="([-\d.]+) ([-\d.]+) ([\d.]+) ([\d.]+)"/.exec(s);
    return new Promise((ok, ko) => { const img = new Image(); img.onload = () => ok(img.naturalWidth); img.onerror = () => ko("img"); img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(s); }); })(); return b; });
  check("tile SVG renders as an image (PNG export path)", () => assert.ok(png > 0));
  await p.click("#exClose");

  // 4. "Plus tard" postpones the welcome
  const { page: q, errors: e2 } = await open(browser, { welcome: true });
  await q.click("#stLater"); await q.reload(); await q.waitForTimeout(500);
  const later = await q.evaluate(() => document.querySelector("#startDlg").open);
  check("'Plus tard' postpones the welcome", () => assert.strictEqual(later, false));

  done(errors.concat(e2));
  await browser.close();
})();
