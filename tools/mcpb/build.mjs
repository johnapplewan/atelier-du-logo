// Builds the Claude Desktop extension: app/downloads/atelier-du-logo.mcpb
// = manifest.json + server/index.js (server.js and the MCP SDK bundled by esbuild) + app/ (the workshop, served offline).
// Run after `npm run build` whenever the app changes: cd tools/mcpb && npm install && node build.mjs
import { build } from "esbuild";
import fs from "fs"; import path from "path"; import { createRequire } from "module";
const require = createRequire(import.meta.url);
const root = path.resolve("../.."), appDir = path.join(root, "app"), out = path.join(root, "app/downloads");
const JSZip = require(path.join(appDir, "vendor/jszip.min.js"));
const VERSION = "1.0.0";

const bundled = await build({ entryPoints: ["server.js"], bundle: true, platform: "node", format: "cjs", target: "node18", minify: true, write: false,
  define: {}, banner: { js: "/* Atelier du Logo, extension Claude Desktop. Includes @modelcontextprotocol/sdk and zod (MIT). */" } });
const serverJs = bundled.outputFiles[0].text.replace("__VERSION__", VERSION);

const manifest = {
  manifest_version: "0.3",
  name: "atelier-du-logo",
  display_name: "Atelier du Logo par John Apple",
  version: VERSION,
  description: "Dessinez votre logo avec Claude : l'atelier s'ouvre dans votre navigateur, Claude lit vos bulles, voit le logo et modifie les tracés.",
  long_description: "L'Atelier du Logo est un éditeur vectoriel de logo et de charte graphique. Cette extension le sert en local (hors ligne) et donne à Claude des outils pour lire le projet ouvert et ses bulles d'annotation, voir un aperçu du logo, exporter le SVG et appliquer des modifications que vous pouvez annuler. Vos projets restent dans votre navigateur.",
  author: { name: "John Apple", url: "https://johnapplewan.github.io/atelier-du-logo/" },
  homepage: "https://johnapplewan.github.io/atelier-du-logo/",
  repository: { type: "git", url: "https://github.com/johnapplewan/atelier-du-logo" },
  license: "MIT",
  icon: "icon.png",
  server: { type: "node", entry_point: "server/index.js",
    mcp_config: { command: "node", args: ["${__dirname}/server/index.js"], env: { ATELIER_PORT: "${user_config.port}" } } },
  tools: [
    { name: "atelier_ouvrir", description: "Ouvre l'atelier dans le navigateur (servi en local, hors ligne)." },
    { name: "atelier_etat", description: "Projet ouvert : marque, palette, calques en tracés SVG, bulles non traitées." },
    { name: "atelier_apercu", description: "Image PNG du logo." },
    { name: "atelier_svg", description: "Le logo complet en SVG." },
    { name: "atelier_appliquer", description: "Modifie les tracés et répond aux bulles, avec annulation possible." }
  ],
  tools_generated: false,
  keywords: ["logo", "design", "vectoriel", "svg", "charte graphique"],
  user_config: { port: { type: "number", title: "Port local", description: "Port de l'atelier sur cet ordinateur (http://127.0.0.1:port).", default: 4718, min: 1024, max: 65535, required: false } },
  compatibility: { claude_desktop: ">=1.0.0", platforms: ["darwin", "win32", "linux"], runtimes: { node: ">=18.0.0" } }
};

const zip = new JSZip(), top = zip;
top.file("manifest.json", JSON.stringify(manifest, null, 2));
top.file("server/index.js", serverJs);
top.file("icon.png", fs.readFileSync(path.join(appDir, "icons/icon-512.png")));
top.file("LICENSE.txt", "Atelier du Logo par John Apple : code sous licence MIT.\nPolices : SIL OFL 1.1 ou Apache 2.0. Bibliothèques : voir app/vendor.\n");
const walk = (d, rel = "") => fs.readdirSync(d, { withFileTypes: true }).forEach(e => {
  const r = rel + e.name; if (e.name.startsWith(".") || r === "downloads") return;
  e.isDirectory() ? walk(path.join(d, e.name), r + "/") : top.file("app/" + r, fs.readFileSync(path.join(d, e.name)));
});
walk(appDir);
fs.mkdirSync(out, { recursive: true });
const buf = await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE", compressionOptions: { level: 9 } });
fs.writeFileSync(path.join(out, "atelier-du-logo.mcpb"), buf);
fs.writeFileSync(path.join(root, "tools/mcpb/manifest.json"), JSON.stringify(manifest, null, 2) + "\n");
console.log("app/downloads/atelier-du-logo.mcpb written (" + Math.round(buf.length / 1024) + " Ko, extension " + VERSION + ")");
