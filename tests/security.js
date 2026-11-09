// Security regressions (audit of 9 Nov 2026): a crafted .atelier.json must not run code in the workshop.
// F1 thumbnail markup, F2 history id / live text attributes / imported glyph data. Network off, dummy key.
const { chromium, assert, open, check, done } = require("./helpers");

const sq = [[{ x: 0, y: 0, i: null, o: null }, { x: 100, y: 0, i: null, o: null }, { x: 100, y: 100, i: null, o: null }, { x: 0, y: 100, i: null, o: null }]];
const base = { layers: [{ id: "a", name: "A", group: "mark", fill: "#000000", visible: true, locked: false, subs: sq }] };
const live = { layers: [{ id: "t", name: "T", group: "mark", fill: "#000000", visible: true, locked: false, kind: "live", subs: sq,
  live: { str: "X", family: 'Inter" onmouseover="window.__pwn3=1" x="', w0: 10, h0: 10, bx: 0, by: 0, dir: "ltr" } }] };
const hist = Object.assign({}, base, { hist: [{ id: 'h"><img src=x onerror="window.__pwn2=1">', label: "x", on: true, at: 1, d: { ents: {}, pos: {}, doc: {} } }] });
const font = { id: "custom-x", name: "X", gkey: "custom-x", k: 0.2, G: { upem: 1000, adv: { A: 600 }, kern: {}, m: { asc: 800, desc: 200 }, gl: { A: 'M0 0"/></svg><img src=x onerror="window.__pwn4=1">' } } };
const file = { format: "atelier-logo", v: 1, fonts: [font], projects: [
  { id: "p1", name: "Vignette", doc: base, thumb: '<img src=x onerror="window.__pwn1=localStorage.getItem(\'atelier-logo-api-key\')">' },
  { id: "p2", name: "Historique", doc: hist }, { id: "p3", name: "Texte", doc: live }] };

(async () => {
  const browser = await chromium.launch();
  const { page: p, ctx, errors } = await open(browser, { init: () => localStorage.setItem("atelier-logo-api-key", "sk-ant-DUMMY-KEY-0000000000000000000000") });
  await ctx.route(u => !/^http:\/\/127\.0\.0\.1/.test(u.toString()), r => r.abort());
  await p.click("#projBtn");
  await p.setInputFiles("#projOpenFile", { name: "x.atelier.json", mimeType: "application/json", buffer: Buffer.from(JSON.stringify(file)) }); await p.waitForTimeout(800);
  const st = await p.evaluate(() => ({ pwn: window.__pwn1 || null, thumbs: [...document.querySelectorAll(".pthumb")].map(b => b.innerHTML.slice(0, 40)), fonts: customFonts.map(c => c.id) }));
  check("F1 imported thumbnail is redrawn, shown as an image, never run", () => { assert.strictEqual(st.pwn, null); assert.ok(st.thumbs.every(h => !/onerror/.test(h)), st.thumbs.join(" | ")); assert.ok(st.thumbs.some(h => /^<img alt="" src="data:image\/svg\+xml/.test(h))); });
  check("F2 imported typeface with markup in its outlines is refused", () => assert.ok(!st.fonts.includes("custom-x"), st.fonts.join()));
  const imported = await p.evaluate(async () => (await P.all()).map(x => [x.name, !!(x.doc && x.doc.hist)]));
  check("F2 unsafe live text refuses the project; an unsafe history is dropped, the drawing kept", () => { const n = imported.map(x => x[0]);
    assert.ok(n.includes("Vignette") && !n.includes("Texte"), n.join()); assert.deepStrictEqual(imported.find(x => x[0] === "Historique"), ["Historique", false]); });
  // the same values reaching the sinks directly are escaped (defence in depth)
  const sinks = await p.evaluate(() => { const a = liveAttrs({ family: 'A" onmouseover="x', dir: "ltr", lang: 'fr" x="1', weight: 400, str: "X" });
    hist = [{ id: 'h"><b>', label: "<i>x</i>", on: true, at: Date.now(), d: { ents: {}, pos: {}, doc: {} } }]; renderHistory(); const h = document.querySelector("#histList").innerHTML; hist = [];
    return { a, h }; });
  check("sinks escape values even if they get through", () => { assert.ok(!/" onmouseover=/.test(sinks.a) && !/" x="1/.test(sinks.a), sinks.a); assert.ok(!/<b>/.test(sinks.h) && !/<i>/.test(sinks.h), sinks.h); });
  const pwn = await p.evaluate(() => [window.__pwn1, window.__pwn2, window.__pwn3, window.__pwn4].filter(Boolean).length);
  check("no injected code ran", () => assert.strictEqual(pwn, 0));
  done(errors.filter(e => !/net::ERR_FAILED|Failed to load resource/.test(e)));
  await browser.close();
})();
