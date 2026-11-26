// Menu bar (Plan / Édition / Animation / Paramètres / Aide), keyboard use, « Nouveau projet », the settings and
// help center (preferences, shortcuts, guide, full FAQ, search), no emoji or symbol characters as button icons.
const { chromium, assert, open, check, done } = require("./helpers");

(async () => {
  const browser = await chromium.launch();
  const { ctx, page: p, errors } = await open(browser, { fresh: true });
  const labels = await p.$$eval("#menubar .mmb", b => b.map(x => x.textContent.trim()));
  check("five menus: Plan, Édition, Animation, Paramètres, Aide", () => assert.deepStrictEqual(labels, ["Plan", "Édition", "Animation", "Paramètres", "Aide"]));
  const logo = await p.evaluate(() => ({ svg: !!document.querySelector("header .brand svg circle"), wm: document.querySelector("header .wm").textContent }));
  check("the workshop's own logo on the left", () => { assert.ok(logo.svg); assert.match(logo.wm, /Atelier.*du logo/i); });

  // pointer: open, follow, close outside
  await p.click("#menubar .mm:nth-child(1) .mmb");
  const open1 = await p.isVisible("#startBtn");
  await p.hover("#menubar .mm:nth-child(2) .mmb");
  const follow = [await p.isVisible("#startBtn"), await p.isVisible("#mUndo")];
  await p.mouse.click(700, 500);
  const closed = !(await p.isVisible("#mUndo"));
  check("a menu opens on click, follows the pointer, closes outside", () => { assert.ok(open1); assert.deepStrictEqual(follow, [false, true]); assert.ok(closed); });

  // keyboard: arrows move inside a menu and across menus, Escape closes
  await p.focus("#menubar .mm:nth-child(4) .mmb"); await p.keyboard.press("ArrowDown");
  const f1 = await p.evaluate(() => document.activeElement.id);
  await p.keyboard.press("ArrowDown"); const f2 = await p.evaluate(() => document.activeElement.id);
  await p.keyboard.press("ArrowRight"); const f3 = await p.evaluate(() => document.activeElement.id);
  await p.keyboard.press("Escape"); const shut = await p.evaluate(() => !document.querySelector("#menubar .mm.open"));
  check("keyboard: arrows inside and across menus, Escape closes", () => { assert.strictEqual(f1, "setBtn"); assert.strictEqual(f2, "scBtn"); assert.strictEqual(f3, "mSearch"); assert.ok(shut); });

  // Plan › Nouveau projet: a new, empty project and the start dialog
  const before = await p.evaluate(() => __projects.current);
  await p.click("#startBtn"); await p.waitForSelector("#startDlg[open]");
  const np = await p.evaluate(() => ({ id: __projects.current, n: __atelier.layers.length }));
  check("Plan › Nouveau projet creates a new project and opens the start dialog", () => { assert.notStrictEqual(np.id, before); assert.strictEqual(np.n, 0); });
  await p.evaluate(() => { const d = document.querySelector("#startDlg"); if (d.open) d.close(); });

  // Édition: toggles show their state; tools from the menu
  await p.click("#mRulers"); const rul = await p.evaluate(() => document.querySelector("#rulersOn").checked);
  await p.click("#menubar .mm:nth-child(2) .mmb"); const chk = await p.getAttribute("#mRulers", "aria-checked"); await p.keyboard.press("Escape");
  await p.evaluate(() => __openMenuFor('[data-mtool="pen"]')); await p.click('[data-mtool="pen"]');
  const t = await p.evaluate(() => document.querySelector('.tools [data-tool="pen"]').classList.contains("on"));
  check("Édition: rulers toggle (state shown as a switch), tools chosen from the menu", () => { assert.ok(rul); assert.strictEqual(chk, "true"); assert.ok(t); });

  // settings and help center
  await p.keyboard.press("Control+k"); await p.waitForSelector("#setDlg[open]");
  const focused = await p.evaluate(() => document.activeElement.id);
  await p.keyboard.type("polices");
  const res = await p.evaluate(() => ({ n: document.querySelectorAll("#setMain [data-res]").length, mark: document.querySelectorAll("#setMain mark").length, faq: [...document.querySelectorAll("#setMain small")].some(s => /Question/.test(s.textContent)) }));
  check("Ctrl+K: search across the guide, shortcuts and questions, words highlighted", () => { assert.strictEqual(focused, "setQ"); assert.ok(res.n >= 2 && res.mark >= 2 && res.faq, JSON.stringify(res)); });
  await p.evaluate(() => { const b = [...document.querySelectorAll("#setMain [data-res]")].find(x => /Question/.test(x.textContent)); b.click(); });
  const opened = await p.evaluate(() => document.querySelectorAll("#setMain details[open]").length);
  check("a question found opens in « Questions fréquentes »", () => assert.ok(opened >= 1));
  const faqN = await p.evaluate(() => { document.querySelector('#setNav [data-set="faq"]').click(); return document.querySelectorAll("#setMain details").length; });
  const guideN = await p.evaluate(() => { document.querySelector('#setNav [data-set="guide"]').click(); return document.querySelectorAll("#setMain .guide h2").length; });
  check("the full FAQ (30 questions or more) and the guide are in the help center", () => { assert.ok(faqN >= 30, String(faqN)); assert.ok(guideN >= 6, String(guideN)); });
  const free = await p.evaluate(() => { document.querySelector('#setNav [data-set="faq"]').click(); return document.querySelector("#setMain details p").textContent; });
  check("the free-of-charge answer makes no lifetime promise", () => { assert.doesNotMatch(free, /pour toujours|le restera\b/); assert.match(free, /pourront devenir payantes/); });
  await p.click("#setClose");

  // no emoji / symbol characters used as button icons in the workshop or Motion
  await p.evaluate(() => __motion.open()); await p.click("#moPlay");
  const bad = await p.evaluate(() => { const re = /[←-⇿⌀-⏿■-◿☀-➿⬀-⯿\u{1F000}-\u{1FAFF}]/u;
    return [...document.querySelectorAll("button, [role^=menuitem]")].map(b => b.textContent.trim()).filter(x => re.test(x.replace(/[←→↓↑]/g, ""))); });
  check("no emoji or symbol characters in buttons (line icons instead)", () => assert.deepStrictEqual(bad, []));
  const play = await p.evaluate(() => document.querySelector("#moPlay svg") !== null);
  check("Motion's player uses drawn icons", () => assert.ok(play));

  await ctx.close(); await browser.close();
  done(errors);
})();
