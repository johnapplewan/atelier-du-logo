// Claude connections outside the artifact: copy the request (context + reply format), paste Claude's reply,
// SVG paths parsed into editable curves, undo banner and history, bubble replies, locked layers left alone.
const { chromium, assert, open, worldToScreen, check, done } = require("./helpers");

(async () => {
  const browser = await chromium.launch();
  const { ctx, page: p, errors } = await open(browser);
  await ctx.grantPermissions(["clipboard-read", "clipboard-write"]);
  const ws = worldToScreen(p);

  await p.keyboard.press("b"); let q = await ws(156, 100); await p.mouse.click(q.x, q.y);
  await p.fill("#noteText", "Fais du point un triangle bleu"); await p.locator("#noteText").blur(); await p.waitForTimeout(300);
  await p.click("#copyReq"); await p.waitForTimeout(200);
  const req = await p.evaluate(() => navigator.clipboard.readText());
  const ctxJson = JSON.parse(req.match(/```json\n([\s\S]*?)\n```/)[1]);
  check("copied request: bubble, layers as SVG paths, reply format", () => {
    assert.strictEqual(ctxJson.bulles[0].demande, "Fais du point un triangle bleu"); assert.strictEqual(ctxJson.bulles[0].calque, "point");
    assert.ok(ctxJson.calques.find(c => c.id === "point").d.startsWith("M")); assert.match(req, /"reponses"/); });

  // Claude's reply, as pasted from claude.ai: prose + json block; relative path, a new layer, a locked one
  await p.evaluate(() => { __atelier.layers.find(l => l.id === "cadre").locked = true; });
  const reply = "Voici le triangle.\n```json\n" + JSON.stringify({ note: "Point en triangle bleu",
    calques: [{ id: "point", d: "m150 80 l20 30 h-40 z", couleur: "#2050C0" }, { id: "etoile", nom: "Étoile", d: "M200 20 Q210 30 220 20 T240 20 L230 40 Z", groupe: "symbole" }, { id: "cadre", d: "M0 0 L10 0 L10 10 Z" }],
    reponses: [{ n: 1, texte: "C'est fait : triangle bleu.", fait: true }] }) + "\n```\nBonne journée !";
  await p.click("#pasteReply"); await p.fill("#cdPaste", reply); await p.click("#cdApply");
  const msg = await p.textContent("#cdMsg");
  const st = await p.evaluate(() => { const L = id => __atelier.layers.find(l => l.id === id); return { pt: L("point").subs[0].map(n => [n.x, n.y]), fill: effFill(L("point")), star: L("etoile") && L("etoile").subs[0].length, starCurve: !!(L("etoile") && L("etoile").subs[0][1].i), cadre: L("cadre").subs[0].length, note: __atelier.notes[0] }; });
  check("reply applied: relative path parsed, colour set", () => { assert.deepStrictEqual(st.pt, [[150, 80], [170, 110], [130, 110]]); assert.strictEqual(st.fill, "#2050C0"); });
  check("new layer added with Q/T curves", () => { assert.strictEqual(st.star, 4); assert.ok(st.starCurve); });
  check("locked layer left untouched and reported", () => { assert.strictEqual(st.cadre, 8); assert.match(msg, /verrouillé.*Cadre/); });
  check("bubble answered and marked done", () => { assert.strictEqual(st.note.reply, "C'est fait : triangle bleu."); assert.ok(st.note.done); });
  await p.click("#cdClose");
  const bar = await p.evaluate(() => [!document.querySelector("#claudeBar").hidden, document.querySelector("#claudeMsg").textContent]);
  check("undo banner shown with Claude's note", () => { assert.ok(bar[0]); assert.match(bar[1], /Point en triangle bleu/); });
  await p.click("#claudeUndo");
  const back = await p.evaluate(() => [__atelier.layers.find(l => l.id === "point").subs[0].length, !!__atelier.layers.find(l => l.id === "etoile")]);
  check("« Annuler la modification de Claude » restores the drawing", () => assert.deepStrictEqual(back, [4, false]));
  const hist = await p.evaluate(() => { document.querySelector("#histBtn").click(); const t = [...document.querySelectorAll("#histList .hl")].map(e => e.textContent); document.querySelector("#histClose").click(); return t; });
  check("history entry « Claude : note »", () => assert.ok(hist.some(t => /^Claude : Point en triangle bleu/.test(t)), hist.join(" | ")));

  await p.click("#pasteReply"); await p.fill("#cdPaste", "pas de json ici"); await p.click("#cdApply");
  const bad = await p.textContent("#cdMsg");
  check("unreadable reply explained", () => assert.match(bad, /illisible/));
  await p.click("#cdClose");

  done(errors);
  await browser.close();
})();
