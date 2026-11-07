// Run after gen.mjs: `node tools/fonts/trim.cjs` (idempotent, rewrites app/fonts.js in place).
// gen.mjs measures each typeface on a reference word (scale "k", baseline "ty") and bakes that word's outlines.
// The app now shapes whatever the user types from the glyph files (app/glyphs/*.js), so the baked outlines are
// dropped, and the sample texts of the world scripts (used for script detection and previews) become neutral.
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const file = path.join(__dirname, "../../app/fonts.js");
const ctx = { window: {} };
vm.runInNewContext(fs.readFileSync(file, "utf8"), ctx);
const fonts = ctx.window.FONTS;

// id -> [display name, sample in that script]
const WORLD = {
  hiragana: ["Hiragana", "ひらがな"],
  katakana: ["Katakana", "カタカナ"],
  kanji: ["Kanji (japonais)", "漢字"],
  hanzi: ["Sinogrammes (chinois)", "汉字"],
  arabic: ["Arabe naskh", "العربية"],
  "arabic-ruqaa": ["Arabe ruqaa", "العربية"],
  thai: ["Thaï", "ภาษาไทย"],
  korean: ["Coréen", "한글"],
  russian: ["Cyrillique", "Кириллица"],
  "russian-sans": ["Cyrillique (sans)", "Кириллица"],
  hindi: ["Devanagari (hindi)", "देवनागरी"],
  hieroglyphs: ["Hiéroglyphes", "𓀀𓁐𓃭𓆣"],
  pictos: ["Pictogrammes", "🌿⭐💡"],
};

for (const f of fonts) {
  delete f.letters;
  delete f.ty;
  f.name = f.name.replace(/\s*\(actuelle\)/, "");
  if (WORLD[f.id]) { f.name = WORLD[f.id][0]; f.text = WORLD[f.id][1]; }
  else if (f.upper) f.text = "ABC";
  else f.text = "Abc";
}
fs.writeFileSync(file, "window.FONTS=" + JSON.stringify(fonts) + ";\n");
console.log("app/fonts.js:", fonts.length, "typefaces,", fs.statSync(file).size, "bytes");
