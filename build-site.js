// Builds site/ for the Cloudflare Worker: the public pages (site-src/) at the root, the workshop (app/) under /atelier/.
// Run by build.js after app/ is written. app/ itself (artifact, GitHub Pages, Desktop extension) is not changed.
const fs = require("fs");
const path = require("path");
const root = __dirname, src = path.join(root, "site-src"), out = path.join(root, "site");
const SITE = (process.env.SITE_URL || "https://atelier-du-logo.johnapplewan.workers.dev").replace(/\/$/, "");

const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
function copyDir(a, b, skip = () => false) {
  fs.mkdirSync(b, { recursive: true });
  for (const e of fs.readdirSync(a, { withFileTypes: true })) {
    if (e.name.startsWith(".") || skip(e.name)) continue;
    const p = path.join(a, e.name), q = path.join(b, e.name);
    if (e.isDirectory()) copyDir(p, q); else fs.copyFileSync(p, q);
  }
}

// small Markdown reader for GUIDE.md (headings, paragraphs, lists, tables, bold, italics, code, links)
function md(text) {
  const inline = s => esc(s).replace(/`([^`]+)`/g, "<code>$1</code>").replace(/\*\*([^*]+)\*\*/g, "<b>$1</b>").replace(/\*([^*]+)\*/g, "<i>$1</i>")
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (m, t, u) => `<a href="${u}">${t}</a>`).replace(/(^|[\s(])(https?:\/\/[^\s<)]+)/g, (m, p, u) => `${p}<a href="${u}">${u}</a>`);
  const lines = text.replace(/\r/g, "").split("\n"), html = []; let i = 0;
  const slug = s => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  while (i < lines.length) {
    const l = lines[i];
    if (!l.trim()) { i++; continue; }
    const h = /^(#{1,3})\s+(.*)$/.exec(l);
    if (h) { const n = h[1].length, t = h[2].replace(/^\d+\.\s*/, ""); html.push(`<h${n} id="${slug(t)}">${inline(h[2])}</h${n}>`); i++; continue; }
    if (/^\|/.test(l)) { const rows = []; while (i < lines.length && /^\|/.test(lines[i])) rows.push(lines[i++]);
      const cells = r => r.replace(/^\||\|$/g, "").split("|").map(c => c.trim());
      html.push(`<table><thead><tr>${cells(rows[0]).map(c => `<th>${inline(c)}</th>`).join("")}</tr></thead><tbody>${rows.slice(2).map(r => `<tr>${cells(r).map(c => `<td>${inline(c)}</td>`).join("")}</tr>`).join("")}</tbody></table>`); continue; }
    if (/^\s*([-*]|\d+\.)\s/.test(l)) { const ord = /^\s*\d+\./.test(l), items = [];
      while (i < lines.length && /^\s*([-*]|\d+\.)\s/.test(lines[i])) { let it = lines[i++].replace(/^\s*([-*]|\d+\.)\s+/, ""); while (i < lines.length && /^\s{2,}\S/.test(lines[i]) && !/^\s*([-*]|\d+\.)\s/.test(lines[i])) it += " " + lines[i++].trim(); items.push(it); }
      html.push(`<${ord ? "ol" : "ul"}>${items.map(t => `<li>${inline(t)}</li>`).join("")}</${ord ? "ol" : "ul"}>`); continue; }
    const para = []; while (i < lines.length && lines[i].trim() && !/^(#|\||\s*([-*]|\d+\.)\s)/.test(lines[i])) para.push(lines[i++].trim());
    html.push(`<p>${inline(para.join(" "))}</p>`);
  }
  return html.join("\n");
}

const NAV = [["fonctionnalites", "/fonctionnalites/", "Fonctionnalités"], ["exemples", "/exemples/", "Exemples"], ["tarifs", "/tarifs/", "Tarifs"], ["aide", "/aide/", "Guide"]];
function buildSite() {
  fs.rmSync(out, { recursive: true, force: true });
  copyDir(path.join(root, "app"), path.join(out, "atelier"));
  copyDir(path.join(src, "assets"), path.join(out, "assets"));
  fs.copyFileSync(path.join(src, "site.css"), path.join(out, "assets/site.css"));
  const layout = fs.readFileSync(path.join(src, "layout.html"), "utf8");
  const v = require("crypto").createHash("sha1").update(fs.readFileSync(path.join(src, "site.css"))).digest("hex").slice(0, 8);
  const pages = fs.readdirSync(path.join(src, "pages")).filter(f => f.endsWith(".html")).map(f => {
    const raw = fs.readFileSync(path.join(src, "pages", f), "utf8"), m = /^<!--meta (\{.*?\}) -->\n?/.exec(raw);
    if (!m) throw new Error("site-src/pages/" + f + ": missing <!--meta {...} --> header");
    const name = f.replace(/\.html$/, "");
    return Object.assign(JSON.parse(m[1]), { name, body: raw.slice(m[0].length) });
  });
  // the guide is written once, in GUIDE.md; on the site its "open the workshop" link points to /atelier/
  const guide = md(fs.readFileSync(path.join(root, "GUIDE.md"), "utf8").replace(/https:\/\/johnapplewan\.github\.io\/atelier-du-logo\/?/g, "/atelier/"));
  pages.push({ name: "aide", title: "Guide — Atelier du Logo", desc: "Le guide de l'Atelier du Logo : démarrer, dessiner, décliner la charte, animer, travailler avec Claude.", nav: "aide", body: `<section><div class="wrap prose">${guide}</div></section>` });
  const urls = [];
  for (const p of pages) {
    const rel = p.name === "index" ? "" : p.name === "404" ? "404.html" : p.name + "/";
    const html = layout.replace(/\{\{(\w+)\}\}/g, (_, k) => ({
      title: esc(p.title), desc: esc(p.desc), url: SITE + "/" + rel, site: SITE, v, year: String(new Date().getFullYear()), body: p.body, bodyClass: p.bodyClass || "",
      loginOn: p.login ? " on" : "",
      nav: NAV.map(([k2, href, label]) => `<a href="${href}"${p.nav === k2 ? ' class="on" aria-current="page"' : ""}>${label}</a>`).join(""),
    })[k] ?? "");
    const file = p.name === "index" ? "index.html" : p.name === "404" ? "404.html" : path.join(p.name, "index.html");
    fs.mkdirSync(path.dirname(path.join(out, file)), { recursive: true });
    fs.writeFileSync(path.join(out, file), html);
    if (p.name !== "404") urls.push(SITE + "/" + rel);
  }
  urls.push(SITE + "/atelier/");
  fs.writeFileSync(path.join(out, "sitemap.xml"), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map(u => `  <url><loc>${u}</loc></url>`).join("\n")}\n</urlset>\n`);
  fs.writeFileSync(path.join(out, "robots.txt"), `User-agent: *\nAllow: /\nDisallow: /compte/\nSitemap: ${SITE}/sitemap.xml\n`);
  fs.copyFileSync(path.join(src, "_headers"), path.join(out, "_headers"));
  fs.copyFileSync(path.join(src, "sw.js"), path.join(out, "sw.js"));
  console.log("site/ written (" + pages.length + " pages, workshop under /atelier/, " + SITE + ")");
}
module.exports = { buildSite, md };
if (require.main === module) buildSite();
