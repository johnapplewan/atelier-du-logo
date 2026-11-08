// Brand book: questionnaire (style, exact colours, typefaces, mood, sections, format), pages, PDF and deposit pack.
const { chromium, assert, open, check, done } = require("./helpers");

(async () => {
  const browser = await chromium.launch();
  const { page: p, errors } = await open(browser, { context: { viewport: { width: 1400, height: 1000 } }, init: () => {
    window.__files = [];
    window.claude = { use: async n => n === "downloads" ? { save: async ({ filename, data }) => { const b = new Uint8Array(await (data.arrayBuffer ? data : new Blob([data])).arrayBuffer()); let s = ""; for (let i = 0; i < b.length; i += 8192) s += String.fromCharCode.apply(null, b.subarray(i, i + 8192)); window.__files.push([filename, s]); return { status: "saved" }; } } : null };
  } });
  await p.click("#startBtn"); await p.fill("#stName", "Atelier Nova"); await p.fill("#stTag", "Des meubles qui durent"); await p.fill("#stKw", "bois, artisanal, premium");
  await p.click('[data-start="example"]'); await p.click("#stGo"); await p.waitForTimeout(500);

  // 1. style: six themes previewed with the logo
  await p.click("#bookBtn"); await p.waitForSelector(".bthemes .bprev svg", { timeout: 20000 });
  const themes = await p.$$eval(".bthemes [data-btheme]", bs => bs.map(b => [b.dataset.btheme, !!b.querySelector("svg path")]));
  check("six cover styles, each previewed", () => { assert.strictEqual(themes.length, 6); assert.ok(themes.every(t => t[1]), JSON.stringify(themes)); });
  await p.click('[data-btheme="luxe"]');
  // 2. exact colours, from the logo
  await p.click("#bookNext"); await p.waitForSelector("[data-bhex=primary]");
  const pre = await p.$$eval("[data-bhex]", is => is.map(i => i.value));
  check("colour roles prefilled from the logo", () => assert.ok(pre.includes("#E0703A") && pre.includes("#22252B"), pre.join()));
  await p.fill("[data-bhex=primary]", "#123456"); await p.dispatchEvent("[data-bhex=primary]", "input");
  await p.click('[data-bset="light"][data-c="#FFFFFF"]');
  // 3. typefaces
  await p.click("#bookNext"); await p.waitForSelector("[data-bfont=title]"); await p.selectOption("[data-bfont=title]", "playfair"); await p.waitForTimeout(300);
  const spec = await p.$eval('[data-bspec="title"] svg path', e => !!e).catch(() => false);
  check("typeface preview with the brand name", () => assert.ok(spec));
  // 4. mood
  await p.click("#bookNext"); await p.waitForSelector("[data-bmood]");
  const moodPre = await p.$$eval("[data-bmood].on", bs => bs.map(b => b.dataset.bmood));
  check("mood words prefilled from the keywords", () => assert.ok(moodPre.includes("artisanal") && moodPre.includes("premium"), moodPre.join()));
  await p.click('[data-bmood="élégant"]'); await p.fill("#bVoice", "Simple et chaleureux.");
  // 5. sections and format
  await p.click("#bookNext"); await p.uncheck('[data-bsec="apps"]'); await p.click('[data-bformat="a4l"]'); await p.fill("#bSite", "nova.fr");
  await p.click("#bookGen"); await p.waitForSelector("#bookPages .bpage svg", { timeout: 20000 });
  const doc = await p.evaluate(() => ({ n: __book.doc.pages.length, ids: __book.doc.pages.map(x => x.id), W: __book.doc.W, H: __book.doc.H, cover: __book.doc.pages[0].svg, colors: __book.doc.pages.find(x => x.id === "colors").svg }));
  check("pages generated from the answers", () => { assert.deepStrictEqual(doc.ids, ["cover", "intro", "logo", "space", "colors", "type", "bgs", "donts", "files"]); assert.deepStrictEqual([Math.round(doc.W), Math.round(doc.H)], [842, 595]); });
  check("chosen style and exact colours used", () => { assert.match(doc.cover, /fill="#121212"/); assert.match(doc.colors, /#123456/); });
  await p.screenshot({ path: __dirname + "/s12.png" });

  // PDF written in the browser
  await p.click("#bookPdf"); await p.waitForFunction(() => __files.some(f => /\.pdf$/.test(f[0])), null, { timeout: 60000 });
  const pdf = await p.evaluate(() => { const f = __files.find(f => /\.pdf$/.test(f[0])); const s = f[1];
    const xref = +/startxref\n(\d+)/.exec(s)[1], offs = s.slice(xref).split("\n").slice(3).filter(l => /^\d{10} 00000 n $/.test(l)).map(l => +l.slice(0, 10));
    return { name: f[0], head: s.slice(0, 8), tail: s.slice(-6), pages: (s.match(/\/Type \/Page /g) || []).length, size: s.length, objs: offs.every((o, i) => s.slice(o, o + 12).startsWith((i + 1) + " 0 obj")), jpeg: (s.match(/\/Filter \/DCTDecode/g) || []).length, box: /\/MediaBox \[0 0 ([\d.]+) ([\d.]+)\]/.exec(s).slice(1).map(Math.round) }; });
  check("PDF named after the brand and format", () => assert.strictEqual(pdf.name, "atelier-nova-charte-a4l.pdf"));
  check("valid PDF structure (header, xref offsets, trailer)", () => { assert.strictEqual(pdf.head, "%PDF-1.4"); assert.match(pdf.tail, /%%EOF/); assert.ok(pdf.objs); });
  check("one page per section, A4 landscape, images embedded", () => { assert.strictEqual(pdf.pages, 9); assert.strictEqual(pdf.jpeg, 9); assert.deepStrictEqual(pdf.box, [842, 595]); });

  // format switch in the viewer
  await p.selectOption("#bookFmt", "slides"); await p.waitForTimeout(600);
  const wh = await p.evaluate(() => [__book.doc.W, __book.doc.H]);
  check("format switch: slides 16:9", () => assert.deepStrictEqual(wh, [960, 540]));

  // deposit pack (JSZip from the CDN; skipped offline)
  await p.click("#bookZip"); const zipped = await p.waitForFunction(() => __files.some(f => /\.zip$/.test(f[0])) || /charger l'outil/.test(document.querySelector("#bookMsg").textContent), null, { timeout: 90000 }).then(() => p.evaluate(() => !!__files.find(f => /\.zip$/.test(f[0]))));
  if (zipped) {
    const names = await p.evaluate(async () => { const f = __files.find(f => /\.zip$/.test(f[0])); const b = new Uint8Array(f[1].length); for (let i = 0; i < b.length; i++) b[i] = f[1].charCodeAt(i); const z = await JSZip.loadAsync(b); return Object.keys(z.files).sort(); });
    check("deposit pack: variants in SVG and PNG, favicon, PDF, read-me", () => { for (const n of ["atelier-nova-logo-couleur.svg", "atelier-nova-logo-negatif.png", "atelier-nova-logo-vertical.svg", "atelier-nova-symbole.png", "atelier-nova-favicon-512.png", "atelier-nova-charte.pdf", "LISEZMOI.txt"]) assert.ok(names.includes(n), n + " missing: " + names.join()); });
  } else console.log("skip zip (JSZip unreachable)");
  await p.click("#bookClose");

  // answers kept with the brand, after reload
  await p.waitForTimeout(900); await p.reload(); await p.waitForTimeout(600);
  await p.click("#bookBtn"); await p.waitForSelector(".bthemes .bprev svg", { timeout: 20000 });
  const kept = await p.evaluate(() => document.querySelector("[data-btheme].on").dataset.btheme);
  check("answers kept after reload", () => assert.strictEqual(kept, "luxe"));

  done(errors);
  await browser.close();
})();
