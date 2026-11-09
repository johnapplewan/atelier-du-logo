// Atelier du Logo: Claude Desktop extension (MCP over stdio).
// Serves the workshop on http://127.0.0.1:<port> (works offline) and bridges Claude's tools to the open page:
// the page listens on /bridge/events (SSE) and posts results to /bridge/result.
const http = require("http"), fs = require("fs"), path = require("path"), { spawn } = require("child_process");
const { McpServer } = require("@modelcontextprotocol/sdk/server/mcp.js");
const { StdioServerTransport } = require("@modelcontextprotocol/sdk/server/stdio.js");
const { z } = require("zod");

const VERSION = "__VERSION__";
const APP = path.join(__dirname, "..", "app");
const PORT0 = parseInt(process.env.ATELIER_PORT || "4718", 10) || 4718;
const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css", ".json": "application/json",
  ".webmanifest": "application/manifest+json", ".svg": "image/svg+xml", ".png": "image/png", ".woff2": "font/woff2", ".txt": "text/plain; charset=utf-8", ".md": "text/plain; charset=utf-8" };
const log = (...a) => process.stderr.write("[atelier] " + a.join(" ") + "\n");   // stdout belongs to MCP

let port = PORT0, clients = [], pending = new Map(), seq = 0;
const url = () => `http://127.0.0.1:${port}/`;

function readBody(req) { return new Promise(ok => { let b = ""; req.on("data", c => { b += c; if (b.length > 2e7) req.destroy(); }); req.on("end", () => ok(b)); }); }
const server = http.createServer(async (req, res) => {
  const u = new URL(req.url, "http://127.0.0.1");
  // only this machine, only this origin
  const origin = req.headers.origin;
  if (origin && !/^http:\/\/(127\.0\.0\.1|localhost):\d+$/.test(origin)) { res.writeHead(403); res.end(); return; }
  if (u.pathname === "/bridge/ping") { res.writeHead(200, { "Content-Type": "application/json", "Cache-Control": "no-store" }); res.end(JSON.stringify({ ok: true, version: VERSION })); return; }
  if (u.pathname === "/bridge/events") {
    res.writeHead(200, { "Content-Type": "text/event-stream", "Cache-Control": "no-store", Connection: "keep-alive" });
    res.write(": ok\n\n"); const c = { res, at: Date.now() }; clients.push(c);
    const ka = setInterval(() => res.write(": ka\n\n"), 20000);
    req.on("close", () => { clearInterval(ka); clients = clients.filter(x => x !== c); });
    return;
  }
  if (u.pathname === "/bridge/result" && req.method === "POST") {
    try { const { id, result } = JSON.parse(await readBody(req)); const p = pending.get(id); if (p) { pending.delete(id); clearTimeout(p.t); p.ok(result); } } catch (_) {}
    res.writeHead(204); res.end(); return;
  }
  let rel = decodeURIComponent(u.pathname).replace(/^\/+/, "") || "index.html";
  const file = path.join(APP, rel);
  if (!file.startsWith(APP) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); res.end(); return; }
  if (rel === "index.html") { // mark the page as served by the extension, so it connects to the bridge
    res.writeHead(200, { "Content-Type": TYPES[".html"], "Cache-Control": "no-cache" });
    res.end(fs.readFileSync(file, "utf8").replace("/*__ATELIER_BRIDGE__*/false", "true")); return; }
  res.writeHead(200, { "Content-Type": TYPES[path.extname(file)] || "application/octet-stream" }); fs.createReadStream(file).pipe(res);
});
function listen() {
  return new Promise(ok => {
    const tryPort = p => { server.once("error", e => { if (e.code === "EADDRINUSE" && p < PORT0 + 10) tryPort(p + 1); else { log("serveur local impossible :", e.message); ok(false); } });
      server.listen(p, "127.0.0.1", () => { port = p; log("atelier servi sur", url()); ok(true); }); };
    tryPort(PORT0);
  });
}

// ask the most recently opened page to run a command
function ask(cmd, args, ms = 30000) {
  const c = clients[clients.length - 1];
  if (!c) return Promise.reject(new Error(`L'atelier n'est pas ouvert. Ouvrez ${url()} dans le navigateur (outil atelier_ouvrir), puis réessayez.`));
  const id = ++seq;
  return new Promise((ok, ko) => {
    const t = setTimeout(() => { pending.delete(id); ko(new Error("L'atelier n'a pas répondu (onglet fermé ou en veille ?).")); }, ms);
    pending.set(id, { ok, t });
    c.res.write(`data: ${JSON.stringify({ id, cmd, args: args || {} })}\n\n`);
  }).then(r => { if (r && r.error) throw new Error(r.error); return r; });
}
function openBrowser(u) {
  const cmd = process.platform === "darwin" ? ["open", [u]] : process.platform === "win32" ? ["cmd", ["/c", "start", "", u]] : ["xdg-open", [u]];
  try { spawn(cmd[0], cmd[1], { detached: true, stdio: "ignore" }).unref(); return true; } catch (_) { return false; }
}
const text = t => ({ content: [{ type: "text", text: t }] });
const fail = e => ({ content: [{ type: "text", text: String(e.message || e) }], isError: true });

const mcp = new McpServer({ name: "atelier-du-logo", version: VERSION });
mcp.registerTool("atelier_ouvrir", {
  title: "Ouvrir l'atelier",
  description: "Ouvre l'Atelier du Logo (éditeur vectoriel de logo) dans le navigateur de l'utilisateur, servi en local et utilisable hors ligne. À appeler si les autres outils répondent que l'atelier n'est pas ouvert.",
  inputSchema: {}
}, async () => { const opened = openBrowser(url()); return text((opened ? "Atelier ouvert dans le navigateur : " : "Ouvrez cette adresse dans le navigateur : ") + url() + (clients.length ? " (une page est déjà connectée)." : "")); });
mcp.registerTool("atelier_etat", {
  title: "Lire le logo et les bulles",
  description: "Renvoie le projet ouvert dans l'atelier : marque (nom, slogan, mots-clés), palette, calques avec leurs tracés SVG (d), et les bulles d'annotation non traitées (demandes de l'utilisateur, avec le calque visé). Coordonnées : symbole dans le carré 0..256 à gauche, mot à partir de x≈300, y vers le bas.",
  inputSchema: {}
}, async () => { try { const r = await ask("state"); return text(JSON.stringify(r)); } catch (e) { return fail(e); } });
mcp.registerTool("atelier_apercu", {
  title: "Voir le logo",
  description: "Image PNG du logo tel qu'il est dans l'atelier (tous les calques visibles). À regarder avant et après une modification.",
  inputSchema: { largeur: z.number().int().min(128).max(2048).optional().describe("largeur en pixels, 1024 par défaut") }
}, async ({ largeur }) => { try { const r = await ask("preview", { width: largeur || 1024 }); return { content: [{ type: "image", data: r.png, mimeType: "image/png" }] }; } catch (e) { return fail(e); } });
mcp.registerTool("atelier_svg", {
  title: "Exporter le SVG",
  description: "Le logo complet en SVG (fichier d'export), pour l'analyser ou le réutiliser.",
  inputSchema: {}
}, async () => { try { const r = await ask("svg"); return text(r.svg); } catch (e) { return fail(e); } });
mcp.registerTool("atelier_appliquer", {
  title: "Modifier le logo",
  description: "Applique tes modifications dans l'atelier, avec un bandeau qui permet à l'utilisateur de les annuler et une entrée « Claude : note » dans l'historique. Ne mets dans calques que ce que tu modifies ou ajoutes ; un id inconnu crée un calque. Tracés d en coordonnées absolues (M, L, C, Q, Z), formes fermées par Z, pas d'arcs. Les calques verrouillés ne sont pas modifiés. Réponds à chaque bulle traitée dans reponses.",
  inputSchema: {
    note: z.string().describe("résumé court de la modification, affiché à l'utilisateur"),
    calques: z.array(z.object({ id: z.string(), d: z.string().optional(), couleur: z.string().optional().describe("#RRGGBB"), nom: z.string().optional(), groupe: z.enum(["symbole", "mot"]).optional() })).optional(),
    supprimer: z.array(z.string()).optional().describe("ids de calques à supprimer"),
    reponses: z.array(z.object({ n: z.number().int(), texte: z.string(), fait: z.boolean().optional() })).optional().describe("réponse affichée dans chaque bulle traitée")
  }
}, async args => { try { const r = await ask("apply", args); return text(r.msg); } catch (e) { return fail(e); } });

(async () => { await listen(); await mcp.connect(new StdioServerTransport()); log("prêt (MCP stdio)"); })();
