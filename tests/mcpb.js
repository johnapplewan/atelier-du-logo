// Claude Desktop extension, end to end: unpack app/downloads/atelier-du-logo.mcpb, start its server as Claude Desktop
// does (MCP over stdio), open the workshop it serves, then call the tools: state, preview, apply.
const { chromium, assert, check, done } = require("./helpers");
const JSZip = require("../app/vendor/jszip.min.js");
const fs = require("fs"), os = require("os"), path = require("path"), { spawn } = require("child_process");

(async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "mcpb-"));
  const zip = await JSZip.loadAsync(fs.readFileSync(path.join(__dirname, "../app/downloads/atelier-du-logo.mcpb")));
  for (const [n, f] of Object.entries(zip.files)) { if (f.dir) continue; const t = path.join(dir, n); fs.mkdirSync(path.dirname(t), { recursive: true }); fs.writeFileSync(t, await f.async("nodebuffer")); }
  const manifest = JSON.parse(fs.readFileSync(path.join(dir, "manifest.json"), "utf8"));
  check("manifest: node server, tools declared", () => { assert.strictEqual(manifest.server.type, "node"); assert.deepStrictEqual(manifest.tools.map(t => t.name), ["atelier_ouvrir", "atelier_etat", "atelier_apercu", "atelier_svg", "atelier_appliquer"]); });

  const port = 47000 + Math.floor(Math.random() * 900);
  const srv = spawn("node", [path.join(dir, "server/index.js")], { env: Object.assign({}, process.env, { ATELIER_PORT: String(port) }), stdio: ["pipe", "pipe", "pipe"] });
  let buf = "", id = 0; const waiting = new Map(); let stderr = "";
  srv.stderr.on("data", d => { stderr += d; });
  srv.stdout.on("data", d => { buf += d; let i; while ((i = buf.indexOf("\n")) >= 0) { const line = buf.slice(0, i); buf = buf.slice(i + 1); if (!line.trim()) continue; const m = JSON.parse(line); if (m.id && waiting.has(m.id)) { waiting.get(m.id)(m); waiting.delete(m.id); } } });
  const rpc = (method, params) => new Promise((ok, ko) => { const k = ++id; waiting.set(k, ok); srv.stdin.write(JSON.stringify({ jsonrpc: "2.0", id: k, method, params }) + "\n"); setTimeout(() => ko(new Error("timeout " + method)), 40000); });
  const call = async (name, args) => (await rpc("tools/call", { name, arguments: args || {} })).result;

  const init = await rpc("initialize", { protocolVersion: "2025-11-25", capabilities: {}, clientInfo: { name: "test", version: "1" } });
  srv.stdin.write(JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized" }) + "\n");
  const tools = (await rpc("tools/list", {})).result.tools.map(t => t.name);
  check("MCP handshake and tools/list", () => { assert.strictEqual(init.result.serverInfo.name, "atelier-du-logo"); assert.ok(tools.includes("atelier_appliquer")); });
  const notOpen = await call("atelier_etat");
  check("tool explains when the workshop is not open", () => { assert.ok(notOpen.isError); assert.match(notOpen.content[0].text, new RegExp("127.0.0.1:" + port)); });

  // the workshop, served by the extension
  const browser = await chromium.launch(); const page = await browser.newPage(); const errors = [];
  page.on("pageerror", e => errors.push(e.message));
  await page.addInitScript(() => { try { localStorage.setItem("atelier-logo-welcome-later", "1"); } catch (_) {} });
  await page.goto(`http://127.0.0.1:${port}/`); await page.waitForFunction(() => window.__atelier && bridge.on, null, { timeout: 15000 });
  await page.evaluate(() => { __atelier.notes.push({ id: "n1", n: 1, x: 156, y: 100, text: "Point plus gros", audio: null, at: new Date().toISOString() }); renderNotes(); });

  const st = await call("atelier_etat"); const S = JSON.parse(st.content[0].text);
  check("atelier_etat: layers as paths and the open bubble", () => { assert.ok(S.calques.length >= 9); assert.strictEqual(S.bulles[0].demande, "Point plus gros"); assert.strictEqual(S.bulles[0].calque, "point"); });
  const pv = await call("atelier_apercu", { largeur: 512 });
  check("atelier_apercu: PNG image", () => { assert.strictEqual(pv.content[0].type, "image"); assert.strictEqual(pv.content[0].mimeType, "image/png"); assert.ok(Buffer.from(pv.content[0].data, "base64").slice(1, 4).toString() === "PNG"); });
  const ap = await call("atelier_appliquer", { note: "Point agrandi", calques: [{ id: "point", d: "M136 100 C136 89 145 80 156 80 C167 80 176 89 176 100 C176 111 167 120 156 120 C145 120 136 111 136 100 Z" }], reponses: [{ n: 1, texte: "Rayon 20.", fait: true }] });
  const after = await page.evaluate(() => [__atelier.layers.find(l => l.id === "point").subs[0][0].x, __atelier.notes[0].reply, !document.querySelector("#claudeBar").hidden]);
  check("atelier_appliquer: curves changed in the page, bubble answered, undo banner", () => { assert.match(ap.content[0].text, /Appliqué/); assert.deepStrictEqual(after, [136, "Rayon 20.", true]); });
  const svg = await call("atelier_svg");
  check("atelier_svg: full logo", () => assert.match(svg.content[0].text, /^<svg|<\?xml/));
  // F3: the bridge needs the per-launch token and our own Host (DNS rebinding, <img> subscriptions)
  const http = require("http"); const get = (pth, host) => new Promise(ok => { const r = http.get({ host: "127.0.0.1", port, path: pth, headers: host ? { Host: host } : {} }, res => { ok(res.statusCode); res.destroy(); }); r.on("error", () => ok(0)); });
  const token = await page.evaluate(() => new URL(bridge.es.url).searchParams.get("t"));
  const codes = [await get("/bridge/events"), await get("/bridge/events?t=wrong"), await get("/bridge/events?t=" + token, "evil.example:" + port), await get("/index.html", "evil.example:" + port), await get("/bridge/ping?t=" + token)];
  check("bridge refuses no token, wrong token and a foreign Host; accepts the page's token", () => assert.deepStrictEqual(codes, [403, 403, 403, 403, 200]));
  const f404 = await page.evaluate(async () => (await fetch("/../../manifest.json")).status);
  check("server serves only the app folder", () => assert.notStrictEqual(f404, 200));

  srv.kill(); await browser.close(); fs.rmSync(dir, { recursive: true, force: true });
  done(errors);
})();
