// Builds app/index.html from src/template.html, inlining the outlines of the default word.
// The word is laid out from app/glyphs/instrument.js (Instrument Serif, SIL OFL 1.1), the same
// glyph file the app loads at runtime, so the default document and live re-typing match exactly.
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const root = __dirname;

// Default example: the workshop's own logo. Line 1 "ATELIER" is the word, line 2 "DU LOGO" a text block,
// both in Montserrat SemiBold capitals (font "montserrat-caps"), tracked like the brand-book version.
const DEFAULT_WORD = "ATELIER", DEFAULT_LINE2 = "DU LOGO";
const FONT_KEY = "montserrat_600SemiBold", FONT_K = 0.227778;   // fonts.js "k" of montserrat-caps (native size)
const X0 = 301;            // text starts after the mark + gap
const L1 = { cap: 74, track: 0.12, baseline: 150 }, L2 = { cap: 31, track: 0.62, baseline: 214 };
const r2 = n => Math.round(n * 100) / 100;

function loadGlyphFile(key) {
  const ctx = { window: {} };
  vm.runInNewContext(fs.readFileSync(path.join(root, "app/glyphs", key + ".js"), "utf8"), ctx);
  return ctx.window.__G[key];
}

// Same parser as parseGlyph() in the template: SVG path in font units -> contours with cubic handles.
function parseGlyph(d, ox) {
  const t = d.match(/[MLQCZ]|-?\d*\.?\d+(?:e-?\d+)?/gi) || [];
  const subs = []; let cur = null, i = 0;
  const num = () => parseFloat(t[i++]);
  while (i < t.length) {
    const c = t[i++];
    if (c === "M") { const x = num() + ox, y = num(); cur = [{ x, y, i: null, o: null }]; subs.push(cur); }
    else if (c === "L") { const x = num() + ox, y = num(); cur.push({ x, y, i: null, o: null }); }
    else if (c === "Q") {
      const qx = num() + ox, qy = num(), x = num() + ox, y = num(), p0 = cur[cur.length - 1];
      p0.o = { x: p0.x + 2 / 3 * (qx - p0.x), y: p0.y + 2 / 3 * (qy - p0.y) };
      cur.push({ x, y, i: { x: x + 2 / 3 * (qx - x), y: y + 2 / 3 * (qy - y) }, o: null });
    }
    else if (c === "C") {
      const ax = num() + ox, ay = num(), bx = num() + ox, by = num(), x = num() + ox, y = num();
      cur[cur.length - 1].o = { x: ax, y: ay }; cur.push({ x, y, i: { x: bx, y: by }, o: null });
    }
    else if (c === "Z") {
      if (cur && cur.length > 1) { const a = cur[0], b = cur[cur.length - 1];
        if (Math.abs(a.x - b.x) < .01 && Math.abs(a.y - b.y) < .01) { a.i = b.i; cur.pop(); } }
    }
  }
  return subs.filter(s => s.length >= 2);
}

function capUnits(G) { let m = 0; parseGlyph(G.gl.H, 0).forEach(c => c.forEach(n => { m = Math.min(m, n.y); })); return -m; }
// one line of capitals at a given cap height and tracking; each letter keeps its baseline (bl) and its box at the
// font's native size (gy), so the workshop re-sets it at the right size when the text or the typeface changes
function layoutLine(str, G, o) {
  const S = o.cap / capUnits(G), chars = [...str], out = []; let pen = 0;
  chars.forEach((ch, i) => {
    if (G.adv[ch] === undefined) throw new Error("missing glyph " + ch);
    if (G.gl[ch]) {
      const subs = parseGlyph(G.gl[ch], 0); let y0 = Infinity, y1 = -Infinity;
      subs.forEach(c => c.forEach(n => { y0 = Math.min(y0, n.y); y1 = Math.max(y1, n.y); }));
      const T = p => p && { x: r2(X0 + pen + p.x * S), y: r2(o.baseline + p.y * S) };
      out.push({ ch, subs: subs.map(c => c.map(n => ({ x: T(n).x, y: T(n).y, i: T(n.i) || null, o: T(n.o) || null }))), bl: o.baseline, gy: [r2(o.baseline + y0 * FONT_K), r2(o.baseline + y1 * FONT_K)] });
    }
    pen += G.adv[ch] * S + o.track * o.cap;
  });
  return out;
}
const G = loadGlyphFile(FONT_KEY);
// measurement labels of the default example (dimension lines, as on an architect's plan), in Inter
function labelLine(str, GL, cap, x, baseline, track) {
  const S = cap / capUnits(GL), out = []; let pen = 0;
  for (const ch of str) { const adv = GL.adv[ch]; if (adv === undefined) throw new Error("missing label glyph " + ch);
    if (GL.gl[ch]) { const T = p => p && { x: r2(x + pen + p.x * S), y: r2(baseline + p.y * S) }; out.push({ ch, subs: parseGlyph(GL.gl[ch], 0).map(c => c.map(n => ({ x: T(n).x, y: T(n).y, i: T(n.i) || null, o: T(n.o) || null }))) }); }
    pen += adv * S + (track || 0) * cap; }
  return { str, letters: out, width: pen };
}
const GI = loadGlyphFile("inter_500Medium");
const lettersBox = ls => { let x0 = Infinity, x1 = -Infinity; ls.forEach(l => l.subs.forEach(c => c.forEach(n => { x0 = Math.min(x0, n.x); x1 = Math.max(x1, n.x); }))); return [x0, x1]; };
const word1 = layoutLine(DEFAULT_WORD, G, L1), word2 = layoutLine(DEFAULT_LINE2, G, L2), [w1x0, w1x1] = lettersBox(word1);
const LAB = 7.5, labels = [
  Object.assign(labelLine("224", GI, LAB, 0, 0), { at: "picto" }),
  Object.assign(labelLine(String(Math.round(w1x0 - 240)), GI, LAB, 0, 0), { at: "ecart" }),
  Object.assign(labelLine("ATELIER " + Math.round(w1x1 - w1x0), GI, LAB, 0, 0, 0.08), { at: "mot" }),
  Object.assign(labelLine("cap " + L1.cap, GI, LAB, 0, 0), { at: "cap1" }),
  Object.assign(labelLine(String(L2.cap), GI, LAB, 0, 0), { at: "cap2" }),
  Object.assign(labelLine("rayon 60 - épaisseur 16", GI, LAB, 0, 0, 0.06), { at: "note" }),
];
const glyphs = { word: DEFAULT_WORD, font: "montserrat-caps", baseline: L1.baseline, letters: word1, line2: { str: DEFAULT_LINE2, letters: word2 }, caps: [L1, L2], labels };
const template = fs.readFileSync(path.join(root, "src/template.html"), "utf8");
if (!template.includes("__GLYPHS__")) throw new Error("src/template.html has no __GLYPHS__ placeholder");
// Support links for "À propos", kept out of git: about.local.json ({paypal, wero}, git-ignored) or env vars.
// In the artifact they normally come from the db doc "atelier/about" instead. The Wero number is encoded
// ("~" + base64 of the reversed text) and only decoded when a visitor clicks "Afficher le numéro".
function aboutLinks() {
  let o = {};
  const f = path.join(root, "about.local.json");
  if (fs.existsSync(f)) o = JSON.parse(fs.readFileSync(f, "utf8"));
  const paypal = process.env.ATELIER_PAYPAL || o.paypal || "", wero = process.env.ATELIER_WERO || o.wero || "";
  const enc = wero ? "~" + Buffer.from([...wero].reverse().join(""), "utf8").toString("base64") : "";
  return { paypal, wero: enc };
}
const about = aboutLinks();
fs.writeFileSync(path.join(root, "app/index.html"), template.replace("__GLYPHS__", () => JSON.stringify(glyphs)).replace("__ABOUT__", () => JSON.stringify(about)));
console.log("app/index.html written (default example: " + DEFAULT_WORD + " / " + DEFAULT_LINE2 + ")");

// ---------- Standalone app: offline file list + service worker ----------
// files.json lists every file the app needs (used by sw.js to precache and by « Télécharger l'appli » to zip).
// sw.js carries a version hash so a new build replaces the old cache.
const crypto = require("crypto");
function listApp(dir, base = "") {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(e => {
    const rel = base + e.name;
    if (e.name.startsWith(".")) return [];
    return e.isDirectory() ? listApp(path.join(dir, e.name), rel + "/") : [rel];
  });
}
const appDir = path.join(root, "app");
const files = listApp(appDir).filter(f => !["sw.js", "files.json"].includes(f) && !f.startsWith("downloads/")).sort();
const hash = crypto.createHash("sha1");
for (const f of files) hash.update(f).update(fs.readFileSync(path.join(appDir, f)));
const version = hash.digest("hex").slice(0, 12);
fs.writeFileSync(path.join(appDir, "files.json"), JSON.stringify({ version, files: ["sw.js", "files.json", ...files] }, null, 1) + "\n");
fs.writeFileSync(path.join(appDir, "sw.js"), fs.readFileSync(path.join(root, "src/sw.js"), "utf8")
  .replace("__VERSION__", version).replace("__FILES__", JSON.stringify(["./", "sw.js", "files.json", ...files])));
console.log("sw.js + files.json written (" + files.length + " files, version " + version + ")");
