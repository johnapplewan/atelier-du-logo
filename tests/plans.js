// Lot B: plans inside a project (create, switch, rename, decline, move, delete), templates, animation plans with a
// frame (Motion stage and exports follow it), images and SVG placed in a plan (rights box, sanitised SVG), files.
const { chromium, assert, open, check, done } = require("./helpers");

const SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" onload="alert(1)"><script>alert(2)</script>
<rect x="10" y="10" width="30" height="30" fill="#c00"/><g transform="translate(50 50)"><circle r="20" fill="#0a0" style="fill:url(javascript:alert(3))"/></g>
<foreignObject width="10" height="10"><div xmlns="http://www.w3.org/1999/xhtml">x</div></foreignObject><image href="http://example.com/a.png" width="5" height="5"/></svg>`;

(async () => {
  const browser = await chromium.launch();
  const { ctx, page: p, errors } = await open(browser, {
    init: () => { window.__files = []; window.claude = { use: async n => n === "downloads" ? { save: async ({ filename, data }) => { window.__files.push([filename, typeof data === "string" ? data : await data.text()]); return { status: "saved" }; } } : null }; } });

  // migration: an existing project gets a single plan « Logo »
  const m = await p.evaluate(() => ({ list: __plans.list, cur: __plans.current, btn: document.querySelector("#planName").textContent }));
  check("an existing project has one plan « Logo », shown in the header", () => { assert.strictEqual(m.list.length, 1); assert.strictEqual(m.list[0].name, "Logo"); assert.strictEqual(m.btn, "Logo"); });

  // menu: Plan › Nouveau plan… (copy of the open plan)
  const n0 = await p.evaluate(() => __atelier.layers.length);
  await p.click("#mNewPlan"); await p.waitForSelector("#newPlanDlg[open]");
  const fmtHidden = await p.isHidden("#npFmtBox");
  await p.fill("#npName", "Variante sombre"); await p.click("#npGo"); await p.waitForTimeout(250);
  const v = await p.evaluate(() => ({ list: __plans.list, cur: __plans.current, n: __atelier.layers.length, btn: document.querySelector("#planName").textContent }));
  check("Plan › Nouveau plan: a copy of the open plan becomes the open plan", () => { assert.ok(fmtHidden); assert.strictEqual(v.list.length, 2); assert.strictEqual(v.btn, "Variante sombre"); assert.strictEqual(v.n, n0); assert.strictEqual(v.cur, v.list[1].id); });

  // plans keep their own drawing
  await p.evaluate(() => { __atelier.layers.splice(0, 1); __atelier.renderAll && __atelier.renderAll(); });
  await p.evaluate(id => __plans.switchTo(id), v.list[0].id); await p.waitForTimeout(150);
  const back = await p.evaluate(() => __atelier.layers.length);
  await p.evaluate(id => __plans.switchTo(id), v.list[1].id); await p.waitForTimeout(150);
  const again = await p.evaluate(() => __atelier.layers.length);
  check("each plan keeps its own drawing when switching", () => { assert.strictEqual(back, n0); assert.strictEqual(again, n0 - 1); });

  // popover: list, rename, collection
  await p.click("#planBtn"); await p.waitForSelector("#planPop:not([hidden])");
  const rows = await p.$$eval("#planPop [data-plan]", r => r.length);
  await p.click(`#planPop [data-pact="ren"][data-id="${v.list[1].id}"]`); await p.waitForSelector("#askDlg[open]");
  await p.fill("#askIn", "Sombre"); await p.click("#askYes"); await p.waitForTimeout(150);
  const ren = await p.evaluate(() => __plans.list[1].name);
  check("the plans popover lists the plans; a plan is renamed", () => { assert.strictEqual(rows, 2); assert.strictEqual(ren, "Sombre"); });
  await p.keyboard.press("Escape").catch(() => {}); await p.evaluate(() => closePlanPop && closePlanPop()).catch(() => {});

  // templates: save, then offered in « Nouveau plan » and in « Nouveau projet »
  await p.click("#mTpl"); await p.waitForSelector("#askDlg[open]"); await p.fill("#askIn", "Mon modèle"); await p.click("#askYes"); await p.waitForTimeout(150);
  const tpls = await p.evaluate(async () => (await __plans.templates()).map(t => t.name));
  check("Plan › Enregistrer comme modèle stores a template", () => assert.deepStrictEqual(tpls, ["Mon modèle"]));
  await p.click("#mNewPlan"); await p.waitForSelector("#newPlanDlg[open]");
  await p.check('#newPlanDlg [data-from][value="template"]'); const tv = await p.isVisible("#npTpls [data-tpl]");
  await p.click("#npTpls [data-tpl]"); await p.click("#npGo"); await p.waitForTimeout(250);
  const fromTpl = await p.evaluate(() => ({ n: __plans.list.length, layers: __atelier.layers.length }));
  check("a new plan can start from a template", () => { assert.ok(tv); assert.strictEqual(fromTpl.n, 3); assert.strictEqual(fromTpl.layers, n0 - 1); });

  // animation plan with a format: frame, Motion stage, export aspect
  await p.click("#mNewAnim"); await p.waitForSelector("#newPlanDlg[open]");
  const fmts = await p.$$eval("#npFormats [data-fmt]", b => b.map(x => x.dataset.fmt));
  await p.click('#npFormats [data-fmt="9:16"]'); await p.check('#newPlanDlg [data-from][value="copy"]'); await p.click("#npGo");
  await p.waitForSelector("#motion.open, #motion[open], #motion:not([hidden])", { timeout: 3000 }).catch(() => {});
  await p.waitForTimeout(300);
  const an = await p.evaluate(() => { const vb = document.querySelector("#moSvg").getAttribute("viewBox").split(" ").map(Number), b = (() => { const ls = __atelier.layers; let x0 = 1e9, x1 = -1e9; ls.forEach(l => (l.subs || []).flat().forEach(n => { x0 = Math.min(x0, n.x); x1 = Math.max(x1, n.x); })); return { x0, x1 }; })();
    return { frame: __plans.frame, vb, ar: getComputedStyle(document.querySelector("#moFrame")).getPropertyValue("--ar").trim(), kind: __plans.list[__plans.list.length - 1].kind, b }; });
  check("Animation › Nouveau plan d'animation offers formats (landscape, portrait, square, 4:3, banners)", () => { for (const k of ["16:9", "9:16", "1:1", "4:3", "3:1"]) assert.ok(fmts.includes(k), k); assert.ok(fmts.includes("perso")); });
  check("an animation plan has its frame; the drawing is placed inside it; Motion shows that frame", () => {
    assert.deepStrictEqual(an.frame, { w: 1080, h: 1920 }); assert.strictEqual(an.kind, "motion");
    assert.deepStrictEqual(an.vb.map(Math.round), [0, 0, 1080, 1920]); assert.strictEqual(+an.ar, 0.5625);
    assert.ok(an.b.x0 >= 0 && an.b.x1 <= 1080, JSON.stringify(an.b)); });
  await p.evaluate(() => openMotionExport()); const asp = await p.$eval("#moExAsp", s => ({ v: s.value, t: s.options[s.selectedIndex].textContent }));
  const info = await p.$eval("#moExInfo", e => e.textContent);
  check("the export uses the plan's format by default", () => { assert.strictEqual(asp.v, "plan"); assert.match(asp.t, /1080 × 1920/); assert.match(info, /1080 × 1920/); });
  await p.click("#moExCancel");

  // images and SVG placed in the plan, from Motion: rights box first
  const PNG = Buffer.from(await p.evaluate(() => { const c = document.createElement("canvas"); c.width = 4; c.height = 2; const x = c.getContext("2d"); x.fillStyle = "#c33"; x.fillRect(0, 0, 4, 2); return c.toDataURL("image/png").split(",")[1]; }), "base64");
  const fc = p.waitForEvent("filechooser"); await p.click("#moPlace"); const chooser = await fc;
  await chooser.setFiles([{ name: "photo.png", mimeType: "image/png", buffer: PNG }, { name: "dessin.svg", mimeType: "image/svg+xml", buffer: Buffer.from(SVG) }, { name: "notes.txt", mimeType: "text/plain", buffer: Buffer.from("x") }]);
  await p.waitForSelector("#confirmDlg[open]"); const rights = await p.textContent("#cfText"); await p.click("#cfYes"); await p.waitForTimeout(600);
  const placed = await p.evaluate(() => { const ls = __atelier.layers, img = ls.find(l => l.kind === "image"), svgL = ls.filter(l => /dessin/.test(l.name || l.id));
    return { img: img && { ref: img.img.ref, w: img.img.w, h: img.img.h, corners: img.subs[0].length }, svg: svgL.map(l => l.fill || l.stroke),
      json: JSON.stringify(ls), stage: !!document.querySelector("#moSvg image"), hist: __atelier.hist ? __atelier.hist.slice(-1)[0] : null }; });
  check("placing files asks for the rights first", () => assert.match(rights, /droits/));
  check("a PNG becomes an image layer (redrawn, stored by hash, 4 corners) shown in Motion", () => { assert.ok(placed.img, "no image layer"); assert.match(placed.img.ref, /^[0-9a-f]{16,40}$/); assert.strictEqual(placed.img.w, 4); assert.strictEqual(placed.img.h, 2); assert.strictEqual(placed.img.corners, 4); assert.ok(placed.stage); });
  check("an SVG is turned into ordinary layers; scripts, handlers, url(), foreignObject and external images are dropped", () => {
    assert.ok(placed.svg.length >= 2, JSON.stringify(placed.svg)); assert.doesNotMatch(placed.json, /alert|javascript|foreignObject|example\.com|onload/i); });
  const dataInLayer = /data:image/.test(placed.json);
  check("image data stays out of the layers (stored as an asset)", () => assert.ok(!dataInLayer));

  // the project file carries the plans and the images; importing restores them
  await p.evaluate(() => __motion.close && __motion.close()).catch(() => {});
  await p.keyboard.press("Escape").catch(() => {});
  await p.evaluate(async () => { await projectFlush(); await exportProjects([curProject.id], curProject.name); });
  const file = await p.evaluate(() => window.__files.slice(-1)[0]);
  const fj = JSON.parse(file[1]);
  check("the project file has every plan and the placed images", () => { assert.strictEqual(fj.projects[0].plans.length, 4); assert.strictEqual(Object.keys(fj.assets).length, 1); assert.match(Object.values(fj.assets)[0], /^data:image\/(png|jpeg);base64,/); });
  // tampered file: bad asset and bad plan are dropped
  fj.assets["0123456789abcdef0123"] = "data:text/html;base64,PHNjcmlwdD4="; fj.projects[0].plans.push({ id: "x", name: 5, kind: "evil" }); fj.projects[0].name = "Copie importée";
  await p.setInputFiles("#projOpenFile", { name: "copie.atelier.json", mimeType: "application/json", buffer: Buffer.from(JSON.stringify(fj)) });
  await p.waitForTimeout(600);
  const imp = await p.evaluate(async () => { const all = await P.all(), q = all.find(x => x.name.startsWith("Copie importée")); return { plans: q && q.plans.length, bad: await P.asset("0123456789abcdef0123") }; });
  check("importing a file restores the plans; invalid plans and assets are refused", () => { assert.strictEqual(imp.plans, 4); assert.ok(!imp.bad); });

  // decline, move to a new project, delete
  const cnt = async () => p.evaluate(() => __plans.list.length);
  const c0 = await cnt(); await p.click("#mDupPlan"); await p.waitForTimeout(250); const c1 = await cnt();
  const dupFrame = await p.evaluate(() => __plans.frame);
  check("Plan › Décliner ce plan duplicates it (an animation plan keeps its frame)", () => { assert.strictEqual(c1, c0 + 1); assert.deepStrictEqual(dupFrame, { w: 1080, h: 1920 }); });
  const cur = await p.evaluate(() => __plans.current);
  await p.evaluate(id => { movePlan(id); }, cur); await p.waitForSelector("#askDlg[open]"); await p.selectOption("#askSel", "__new"); await p.click("#askYes"); await p.waitForTimeout(300);
  const mv = await p.evaluate(async id => ({ n: __plans.list.length, other: (await P.all()).some(q => q.id !== curProject.id && (q.plans || []).some(e => e.id === id)) }), cur);
  check("a plan moves to another (new) project", () => { assert.strictEqual(mv.n, c0); assert.ok(mv.other); });
  const del = await p.evaluate(() => __plans.list[1].id);
  await p.evaluate(id => { deletePlan(id); }, del); await p.waitForSelector("#confirmDlg[open]"); await p.click("#cfYes"); await p.waitForTimeout(250);
  const after = await cnt();
  check("a plan is deleted after confirmation", () => assert.strictEqual(after, c0 - 1));

  // « Nouveau projet » offers my templates
  await p.click("#startBtn"); await p.waitForSelector("#startDlg[open]"); await p.waitForTimeout(150);
  const stTpl = await p.isVisible("#stTplBtn");
  await p.fill("#stName", "Studio Test"); await p.click("#stTplBtn"); await p.click("#stTpls [data-stpl]"); await p.click("#stGo"); await p.waitForTimeout(300);
  const st = await p.evaluate(() => __atelier.layers.length);
  check("Nouveau projet offers « Un de mes modèles » and starts from it", () => { assert.ok(stTpl); assert.strictEqual(st, n0 - 1); });

  await ctx.close(); await browser.close();
  done(errors);
})();
