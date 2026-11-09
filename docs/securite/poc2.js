const { chromium } = require("playwright"); const { open } = require("../../tests/helpers");
const font = { id: "custom-x", name: "X", gkey: "custom-x", k: 0.2, G: { upem: 1000, adv: { A: 600 }, kern: {}, m: { asc: 800, desc: 200, cap: 700 }, gl: { A: 'M0 0"/></svg><img src=x onerror="window.__pwn4=1">' } } };
const file = { format: "atelier-logo", v: 1, projects: [], fonts: [font] };
(async () => { const b = await chromium.launch(); const { page: p, ctx } = await open(b); await ctx.route(u => !/^http:\/\/127\.0\.0\.1/.test(u.toString()), r => r.abort());
  await p.click("#projBtn"); await p.setInputFiles("#projOpenFile", { name: "f.atelier.json", mimeType: "application/json", buffer: Buffer.from(JSON.stringify(file)) }); await p.waitForTimeout(600);
  await p.evaluate(() => document.querySelectorAll("dialog[open]").forEach(d => d.close()));
  await p.click("#fontBtn"); await p.click("#myFonts"); await p.waitForTimeout(300); await p.evaluate(() => { const b = document.querySelector('#fmList [data-fm="custom-x"]'); b && b.click(); }); await p.waitForTimeout(500);
  console.log(JSON.stringify({ font_glyph_xss: await p.evaluate(() => window.__pwn4 || null) })); await b.close(); })();
