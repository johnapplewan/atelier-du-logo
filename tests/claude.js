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

  // API key: request to api.anthropic.com (mocked, streamed), reply applied
  let sent = null;
  await p.route("https://api.anthropic.com/**", async r => {
    sent = { url: r.request().url(), headers: r.request().headers(), body: JSON.parse(r.request().postData()) };
    const json = JSON.stringify({ note: "Disque agrandi", calques: [{ id: "disque", d: "M60 128 C60 90 90 60 128 60 C166 60 196 90 196 128 C196 166 166 196 128 196 C90 196 60 166 60 128 Z" }], supprimer: [], reponses: [{ n: 2, texte: "Disque agrandi.", fait: true }] });
    const ev = (t, d) => `event: ${t}\ndata: ${JSON.stringify(Object.assign({ type: t }, d))}\n\n`;
    const body = ev("message_start", { message: { id: "msg_1", type: "message", role: "assistant", model: "claude-opus-5-5", content: [], stop_reason: null, stop_sequence: null, usage: { input_tokens: 900, output_tokens: 1 } } }) +
      ev("content_block_start", { index: 0, content_block: { type: "text", text: "" } }) +
      ev("content_block_delta", { index: 0, delta: { type: "text_delta", text: json.slice(0, 40) } }) + ev("content_block_delta", { index: 0, delta: { type: "text_delta", text: json.slice(40) } }) +
      ev("content_block_stop", { index: 0 }) + ev("message_delta", { delta: { stop_reason: "end_turn", stop_sequence: null }, usage: { output_tokens: 120 } }) + ev("message_stop", {});
    await r.fulfill({ status: 200, headers: { "content-type": "text/event-stream", "access-control-allow-origin": "*" }, body });
  });
  const noBtn = await p.locator("#askApi").count();
  await p.click("#cdOpen"); await p.fill("#cdKey", "sk-ant-api03-" + "x".repeat(40)); await p.click("#cdKeySave"); await p.click("#cdClose");
  await p.keyboard.press("b"); q = await ws(128, 200); await p.mouse.click(q.x, q.y);
  await p.fill("#noteText", "Agrandis le disque"); await p.locator("#noteText").blur(); await p.waitForTimeout(300);
  await p.click("#askApi"); await p.waitForFunction(() => /Claude a répondu|Erreur|Clé/.test(document.querySelector("#sendMsg").textContent), null, { timeout: 15000 });
  const apiMsg = await p.textContent("#sendMsg");
  const disk = await p.evaluate(() => { const L = __atelier.layers.find(l => l.id === "disque"); return [L.subs[0].length, L.subs[0][0].x, __atelier.notes.find(n => n.n === 2).reply]; });
  check("API button only once a key is saved", () => assert.strictEqual(noBtn, 0));
  check("API request: Opus 5.5, server-side fallbacks, structured output, logo image, key header", () => {
    assert.strictEqual(sent.body.model, "claude-opus-5-5"); assert.strictEqual(sent.body.fallbacks, "default"); assert.match(sent.headers["anthropic-beta"], /server-side-fallback-2026-07-01/);
    assert.strictEqual(sent.body.output_config.format.type, "json_schema"); assert.strictEqual(sent.body.messages[0].content[0].type, "image");
    assert.match(sent.body.messages[0].content[1].text, /Agrandis le disque/); assert.match(sent.headers["x-api-key"] || sent.headers.authorization || "", /sk-ant-/); assert.ok(sent.body.stream); });
  check("API reply applied to the drawing and the bubble", () => { assert.match(apiMsg, /Claude a répondu/); assert.deepStrictEqual(disk, [4, 60, "Disque agrandi."]); });
  await p.route("https://api.anthropic.com/**", r => r.fulfill({ status: 401, headers: { "content-type": "application/json", "access-control-allow-origin": "*" }, body: JSON.stringify({ type: "error", error: { type: "authentication_error", message: "invalid x-api-key" } }) }));
  await p.fill("#noteText", "Encore"); await p.locator("#noteText").blur(); await p.evaluate(() => { __atelier.notes.forEach(n => n.done = false); renderNotes(); });
  await p.waitForTimeout(200); await p.click("#askApi"); await p.waitForFunction(() => /Clé API refusée/.test(document.querySelector("#sendMsg").textContent), null, { timeout: 15000 }).catch(() => {});
  const badKey = await p.textContent("#sendMsg");
  check("bad key explained in French", () => assert.match(badKey, /Clé API refusée/));

  done(errors.filter(e => !/status of 401/.test(e))); // the 401 above is the bad-key scenario
  await browser.close();
})();
