// Builds app/index.html from src/template.html, inlining the outlines of the default word.
// The word is laid out from app/glyphs/instrument.js (Instrument Serif, SIL OFL 1.1), the same
// glyph file the app loads at runtime, so the default document and live re-typing match exactly.
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const root = __dirname;

const DEFAULT_WORD = "Marque";
const SCALE = 0.218959;   // Instrument Serif at 219 units per em, as in the font list (fonts.js "k")
const BASELINE = 202.46;  // shared baseline of the word line (mark spans 0..256)
const X0 = 301;           // text starts after the mark + gap

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

function layoutWord(str, G) {
  const chars = [...str], letters = []; let pen = 0;
  chars.forEach((ch, i) => {
    if (G.adv[ch] === undefined) throw new Error("missing glyph " + ch);
    if (G.gl[ch]) letters.push({ ch, subs: parseGlyph(G.gl[ch], pen) });
    pen += G.adv[ch] + ((G.kern && G.kern[ch + (chars[i + 1] || "")]) || 0);
  });
  const T = p => p && { x: r2(X0 + p.x * SCALE), y: r2(BASELINE + p.y * SCALE) };
  return letters.map(l => ({ ch: l.ch, subs: l.subs.map(s => s.map(n => ({ x: T(n).x, y: T(n).y, i: T(n.i) || null, o: T(n.o) || null }))) }));
}

const glyphs = { word: DEFAULT_WORD, baseline: BASELINE, letters: layoutWord(DEFAULT_WORD, loadGlyphFile("instrument")) };
const template = fs.readFileSync(path.join(root, "src/template.html"), "utf8");
if (!template.includes("__GLYPHS__")) throw new Error("src/template.html has no __GLYPHS__ placeholder");
fs.writeFileSync(path.join(root, "app/index.html"), template.replace("__GLYPHS__", () => JSON.stringify(glyphs)));
console.log("app/index.html written (default word: " + DEFAULT_WORD + ")");
