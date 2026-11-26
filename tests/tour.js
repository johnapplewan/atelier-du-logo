// Lot D: guided tour at first launch (after the start dialog), replayable from Aide; « i » info points on panels,
// dialogs and Motion, with a short text and a link to the guide; the preference hides them.
const { chromium, assert, open, check, done } = require("./helpers");

(async () => {
  const browser = await chromium.launch();

  // first launch: start dialog, then the tour
  const a = await open(browser, { fresh: true, welcome: true, tour: true });
  const p = a.page;
  await p.waitForSelector("#startDlg[open]");
  await p.click("#stLater"); await p.waitForSelector("#tour:popover-open", { timeout: 3000 });
  const s0 = await p.evaluate(() => ({ n: document.querySelector("#tourN").textContent, t: document.querySelector("#tourT").textContent, btn: document.querySelector("#tourNext").textContent, focus: document.activeElement.id }));
  check("first launch: after the start dialog, the guided tour opens on a welcome step", () => { assert.match(s0.n, /^1 \/ \d+$/); assert.match(s0.t, /Bienvenue/); assert.match(s0.btn, /Commencer/); assert.strictEqual(s0.focus, "tourNext"); });

  await p.click("#tourNext"); await p.waitForTimeout(400);
  const s1 = await p.evaluate(() => { const h = document.querySelector("#tour .tour-hole").getBoundingClientRect(), b = document.querySelector("#menubar .mm:nth-child(1) .mmb").getBoundingClientRect();
    return { t: document.querySelector("#tourT").textContent, inside: h.left <= b.left && h.right >= b.right && h.top <= b.top && h.bottom >= b.bottom }; });
  check("step 2 spotlights the Plan menu", () => { assert.match(s1.t, /Plan/); assert.ok(s1.inside); });

  // keyboard: arrows move, drawing shortcuts are not triggered, Escape ends
  const tool0 = await p.evaluate(() => document.querySelector(".tools .on") && document.querySelector(".tools .on").dataset.tool);
  await p.keyboard.press("ArrowRight"); await p.keyboard.press("p");
  const s2 = await p.evaluate(() => ({ step: __tour.step, tool: document.querySelector(".tools .on") && document.querySelector(".tools .on").dataset.tool }));
  await p.keyboard.press("ArrowLeft"); const back = await p.evaluate(() => __tour.step);
  check("arrows move through the steps; letters do not reach the drawing tools", () => { assert.strictEqual(s2.step, 2); assert.strictEqual(s2.tool, tool0); assert.strictEqual(back, 1); });
  const titles = [];
  for (let i = 0; i < 20 && await p.evaluate(() => __tour.step) >= 0; i++) { titles.push(await p.textContent("#tourT")); await p.click("#tourNext"); }
  check("the tour covers Plan, plans, Édition, layers, Claude, Animation, export and help, then ends", () => {
    for (const w of ["Plan", "plans", "Édition", "Calques", "Claude", "Animation", "Exporter", "aide"]) assert.ok(titles.some(t => t.includes(w)), w);
    assert.strictEqual(titles.length, 8); });
  const seen = await p.evaluate(() => ({ k: localStorage.getItem("atelier-logo-tour"), open: !!document.querySelector("#tour:popover-open") }));
  check("once finished, it is not shown again", () => { assert.ok(seen.k); assert.ok(!seen.open); });

  // replay from Aide, skip with Escape
  await p.click("#mTour"); await p.waitForSelector("#tour:popover-open");
  await p.keyboard.press("Escape"); const esc = await p.evaluate(() => ({ open: !!document.querySelector("#tour:popover-open"), step: __tour.step }));
  check("Aide › Visite guidée replays it; Escape skips it", () => { assert.ok(!esc.open); assert.strictEqual(esc.step, -1); });
  await a.ctx.close();

  // info points
  const b = await open(browser, { fresh: true });
  const q = b.page;
  const pts = await q.evaluate(() => ["tools", "grid", "palette", "layers", "notes", "export", "start", "import", "projects", "book", "fonts", "claude", "newplan", "selection"]
    .filter(k => !document.querySelector(`.info[data-infok="${k}"]`)));
  check("every panel and dialog title has an « i » point", () => assert.deepStrictEqual(pts, []));
  await q.click('#layersSec .info'); await q.waitForSelector("#infoPop:popover-open");
  const pop = await q.evaluate(() => ({ t: document.querySelector("#infoPop b").textContent, p: document.querySelector("#infoPop p").textContent, go: document.querySelector("#infoPop .infogo").textContent, exp: document.querySelector("#layersSec .info").getAttribute("aria-expanded") }));
  check("an « i » opens a short explanation with a link to the guide", () => { assert.strictEqual(pop.t, "Calques"); assert.ok(pop.p.length > 40); assert.match(pop.go, /Guide : Dessiner/); assert.strictEqual(pop.exp, "true"); });
  await q.keyboard.press("Escape"); const closed = await q.evaluate(() => !document.querySelector("#infoPop:popover-open"));
  check("Escape closes it", () => assert.ok(closed));
  await q.click('#layersSec .info'); await q.click("#infoPop .infogo"); await q.waitForSelector("#setDlg[open]");
  const g = await q.evaluate(() => ({ sec: document.querySelector('#setNav [data-set="guide"]').getAttribute("aria-current") || document.querySelector('#setNav [data-set="guide"]').className, h: !!document.querySelector("#setMain .guide h2.hit") }));
  check("« Lire dans le guide » opens the right guide section", () => assert.ok(g.h, JSON.stringify(g)));
  await q.click("#setClose");

  // inside a modal dialog and in Motion
  await q.evaluate(() => openNewPlan("motion")); await q.waitForSelector("#newPlanDlg[open]");
  await q.click("#newPlanDlg .info"); const inDlg = await q.evaluate(() => { const r = document.querySelector("#infoPop").getBoundingClientRect(); const el = document.elementFromPoint(r.left + 10, r.top + 10); return !!(el && el.closest("#infoPop")); });
  check("the info pop shows above an open dialog", () => assert.ok(inDlg));
  await q.keyboard.press("Escape"); const dlgStill = await q.evaluate(() => document.querySelector("#newPlanDlg").open);
  check("Escape closes the info pop first, not the dialog", () => assert.ok(dlgStill));
  await q.evaluate(() => document.querySelector("#newPlanDlg").close());
  await q.evaluate(() => __motion.open()); await q.waitForTimeout(200);
  const mo = await q.evaluate(() => ["mo-recipes", "mo-sound", "mo-layers", "mo-add", "mo-list", "mo-export"].filter(k => !document.querySelector(`.info[data-infok="${k}"]`)));
  check("Motion's sections and export have « i » points", () => assert.deepStrictEqual(mo, []));
  await q.evaluate(() => __motion.close && __motion.close());

  // preference
  await q.click("#mInfoOn"); const hid = await q.evaluate(() => ({ vis: getComputedStyle(document.querySelector("#layersSec .info")).display, k: localStorage.getItem("atelier-logo-info") }));
  check("Paramètres › Points d'information hides them (remembered)", () => { assert.strictEqual(hid.vis, "none"); assert.strictEqual(hid.k, "0"); });

  await b.ctx.close(); await browser.close();
  done([...a.errors, ...b.errors]);
})();
