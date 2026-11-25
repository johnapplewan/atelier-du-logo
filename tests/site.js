// Public site for the Cloudflare Worker (site/, built by build-site.js): every page renders without errors, has one
// h1, the shared navigation and footer; every internal link resolves; the workshop opens under /atelier/; unknown
// paths get the 404 page; security headers, sitemap and the retiring root service worker are in place.
const { chromium, assert, check, done } = require("./helpers");
const http = require("http"), fs = require("fs"), path = require("path");
const ROOT = path.resolve(__dirname, "../site");
const T = { ".html": "text/html; charset=utf-8", ".css": "text/css", ".js": "text/javascript", ".svg": "image/svg+xml", ".webp": "image/webp", ".png": "image/png", ".woff2": "font/woff2", ".json": "application/json", ".webmanifest": "application/manifest+json", ".xml": "application/xml", ".txt": "text/plain" };
// like Cloudflare's static assets: /dir/ -> dir/index.html, unknown -> 404.html with status 404
const resolve = u => { let f = path.join(ROOT, decodeURIComponent(u.split(/[?#]/)[0])); if (!f.startsWith(ROOT)) return null;
  if (fs.existsSync(f) && fs.statSync(f).isDirectory()) f = path.join(f, "index.html"); return fs.existsSync(f) ? f : null; };

(async () => {
  check("site/ was built (run npm run build)", () => assert.ok(fs.existsSync(path.join(ROOT, "index.html"))));
  const srv = http.createServer((q, r) => { const f = resolve(q.url);
    if (!f) { r.writeHead(404, { "Content-Type": T[".html"] }); return r.end(fs.readFileSync(path.join(ROOT, "404.html"))); }
    r.writeHead(200, { "Content-Type": T[path.extname(f)] || "application/octet-stream" }); fs.createReadStream(f).pipe(r); });
  await new Promise(ok => srv.listen(0, "127.0.0.1", ok)); srv.unref();
  const base = "http://127.0.0.1:" + srv.address().port;
  const browser = await chromium.launch(), errors = [];
  const ctx = await browser.newContext(); await ctx.route(/fonts\.(googleapis|gstatic)/, r => r.abort());
  const p = await ctx.newPage(); p.on("pageerror", e => errors.push(e.message)); p.on("console", m => { if (m.type() === "error" && !/net::ERR_FAILED/.test(m.text()) && !/nexiste-pas/.test(p.url())) errors.push(p.url() + " " + m.text()); });

  const pages = ["/", "/fonctionnalites/", "/exemples/", "/tarifs/", "/nouveautes/", "/aide/", "/a-propos/", "/contact/", "/connexion/", "/inscription/", "/mot-de-passe-oublie/", "/compte/", "/mentions-legales/", "/cgu/", "/confidentialite/"];
  const links = new Set(), bad = [];
  for (const u of pages) {
    const res = await p.goto(base + u);
    const info = await p.evaluate(() => ({ h1: document.querySelectorAll("h1").length, nav: !!document.querySelector("header.nav .brand"), foot: !!document.querySelector("footer.foot"), title: document.title,
      hrefs: [...document.querySelectorAll("a[href], img[src], link[href]")].map(a => a.getAttribute("href") || a.getAttribute("src")), imgs: [...document.images].filter(i => i.complete && !i.naturalWidth).map(i => i.src) }));
    if (res.status() !== 200 || info.h1 !== 1 || !info.nav || !info.foot || !info.title || info.imgs.length) bad.push(u + " " + JSON.stringify(Object.assign(info, { hrefs: undefined, status: res.status() })));
    info.hrefs.filter(h => h && h.startsWith("/") && !h.startsWith("//")).forEach(h => links.add(h.split("#")[0]));
  }
  check("every page renders: status 200, one h1, navigation, footer, title, images load", () => assert.deepStrictEqual(bad, []));
  const broken = [...links].filter(h => !resolve(h));
  check("every internal link and asset resolves", () => assert.deepStrictEqual(broken, []));

  const nf = await p.goto(base + "/nexiste-pas/");
  check("unknown paths get the 404 page", () => { assert.strictEqual(nf.status(), 404); });
  await p.goto(base + "/atelier/"); await p.waitForFunction(() => window.__atelier && window.__motion, null, { timeout: 20000 });
  check("the workshop opens under /atelier/ (with Motion)", () => assert.ok(true));

  const hd = fs.readFileSync(path.join(ROOT, "_headers"), "utf8");
  check("security headers: CSP with frame-ancestors, nosniff, microphone allowed for voice bubbles", () => {
    assert.match(hd, /frame-ancestors 'none'/); assert.match(hd, /X-Content-Type-Options: nosniff/); assert.match(hd, /microphone=\(self\)/); assert.match(hd, /\/atelier\/sw\.js\n\s+Cache-Control: no-cache/); });
  const sw = fs.readFileSync(path.join(ROOT, "sw.js"), "utf8"), sm = fs.readFileSync(path.join(ROOT, "sitemap.xml"), "utf8");
  check("the root service worker of the earlier version unregisters itself and caches nothing", () => { assert.match(sw, /registration\.unregister\(\)/); assert.doesNotMatch(sw, /caches\./); });
  check("sitemap lists the public pages and the workshop, not the 404", () => { assert.ok(pages.every(u => sm.includes(u === "/" ? "/</loc>" : u))); assert.match(sm, /\/atelier\//); assert.doesNotMatch(sm, /404/); });
  const legal = fs.readFileSync(path.join(ROOT, "cgu/index.html"), "utf8");
  check("terms forbid protected works without the rights holders' consent and limit liability", () => { assert.match(legal, /sans l'autorisation de leurs ayants droit/); assert.match(legal, /utilisation non conforme/); });

  await browser.close();
  done(errors);
})();
