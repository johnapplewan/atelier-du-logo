// Builds app/index.html from src/template.html, inlining the default word's outlines.
const fs = require("fs");
const path = require("path");
const root = __dirname;
const template = fs.readFileSync(path.join(root, "src/template.html"), "utf8");
const glyphs = fs.readFileSync(path.join(root, "tools/word/glyphs.json"), "utf8").trim();
if (!template.includes("__GLYPHS__")) throw new Error("src/template.html has no __GLYPHS__ placeholder");
fs.writeFileSync(path.join(root, "app/index.html"), template.replace("__GLYPHS__", () => glyphs));
console.log("app/index.html written");
