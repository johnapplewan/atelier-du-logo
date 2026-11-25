// Motion module, step 5: exports. Animated SVG (valid XML, native SMIL animations, no script, no internal attributes),
// GIF (own encoder: valid file, one image per frame, loops), MP4 and WebM (WebCodecs + bundled muxers); format
// choices in the dialog; works on a phone.
const { chromium, assert, open, check, done } = require("./helpers");
const fs = require("fs");

// counts the images of a GIF and reads its loop extension
function gifInfo(buf) {
  const head = buf.slice(0, 6).toString("latin1"); let p = 13, frames = 0, loop = false;
  if (buf[10] & 0x80) p += 3 * (1 << ((buf[10] & 7) + 1));
  const subs = () => { while (buf[p]) p += buf[p] + 1; p++; };
  while (p < buf.length) { const b = buf[p++];
    if (b === 0x21) { const label = buf[p++]; if (label === 0xFF && buf.slice(p + 1, p + 12).toString("latin1") === "NETSCAPE2.0") loop = true; subs(); }
    else if (b === 0x2C) { frames++; const pk = buf[p + 8]; p += 9; if (pk & 0x80) p += 3 * (1 << ((pk & 7) + 1)); p++; subs(); }
    else if (b === 0x3B) break; else throw new Error("bad block " + b); }
  return { head, frames, loop, w: buf.readUInt16LE(6), h: buf.readUInt16LE(8) };
}

(async () => {
  const browser = await chromium.launch();
  const { ctx, page: p, errors } = await open(browser, { context: { acceptDownloads: true } });
  await p.click("#motionBtn"); await p.waitForSelector("#motion:not([hidden])"); await p.click("#moPlay");
  await p.fill("#moDur", "2"); await p.dispatchEvent("#moDur", "input");
  await p.click('[data-recipe="elegante"]'); await p.click("#moPlay");
  const before = await p.evaluate(() => JSON.stringify(__atelier.layers));

  const sv = await p.evaluate(() => { const s = __motion.exportSVG({ bg: "#FFFFFF" }), d = new DOMParser().parseFromString(s, "image/svg+xml");
    const anims = [...d.querySelectorAll("animate, animateTransform")];
    return { err: !!d.querySelector("parsererror"), n: anims.length, script: /<script|on\w+=/i.test(s), data: /data-[a-z]+=/.test(s),
      keysOk: anims.every(a => !a.getAttribute("keyTimes") || a.getAttribute("keyTimes").split(";").length === a.getAttribute("values").split(";").length),
      w: d.documentElement.getAttribute("width"), title: (d.querySelector("title") || {}).textContent }; });
  check("animated SVG: valid, native SMIL animations, no script and no internal attributes", () => {
    assert.ok(!sv.err && sv.n > 5 && sv.keysOk, JSON.stringify(sv)); assert.ok(!sv.script && !sv.data); assert.strictEqual(sv.w, "1600"); assert.ok(/animation/.test(sv.title)); });

  await p.click("#moExport"); await p.waitForSelector("#moExDlg[open]");
  const dlg = await p.evaluate(() => ({ fmts: [...document.querySelectorAll("input[name=moexf]")].map(i => i.value) }));
  await p.check("input[name=moexf][value=gif]");
  const trGif = await p.evaluate(() => document.querySelector('#moExBg option[value=""]').disabled);
  await p.check("input[name=moexf][value=svg]");
  const trSvg = await p.evaluate(() => document.querySelector('#moExBg option[value=""]').disabled);
  check("export dialog: MP4, WebM, GIF, SVG animé, WAV; transparent background only for SVG", () => { assert.deepStrictEqual(dlg.fmts, ["mp4", "webm", "gif", "svg", "wav"]); assert.ok(trGif && !trSvg); });

  const run = async (fmt, size, fps, asp) => {
    await p.check(`input[name=moexf][value=${fmt}]`); if (size) await p.selectOption("#moExSize", size); if (fps) await p.selectOption("#moExFps", fps); if (asp) await p.selectOption("#moExAsp", asp);
    const [dl] = await Promise.all([p.waitForEvent("download", { timeout: 120000 }), p.click("#moExGo")]);
    const file = await dl.path(); await p.waitForFunction(() => /Enregistré/.test(document.querySelector("#moExMsg").textContent));
    return { name: dl.suggestedFilename(), buf: fs.readFileSync(file) };
  };
  const g = await run("gif", "360", "10", "1:1"), gi = gifInfo(g.buf);
  check("GIF: valid file, one image per frame, loops, square 360 px", () => { assert.strictEqual(gi.head, "GIF89a"); assert.strictEqual(gi.frames, 20); assert.ok(gi.loop); assert.deepStrictEqual([gi.w, gi.h], [360, 360]); assert.match(g.name, /animation-1x1\.gif$/); });

  const enc = await p.evaluate(() => ({ mp4: !document.querySelector("input[value=mp4]").disabled, webm: !document.querySelector("input[value=webm]").disabled }));
  if (enc.mp4) { const m = await run("mp4", "720", "24", "16:9");
    check("MP4: H.264 in an MP4 file", () => { assert.strictEqual(m.buf.slice(4, 8).toString("latin1"), "ftyp"); assert.ok(m.buf.includes(Buffer.from("moov")) && m.buf.includes(Buffer.from("avc1"))); assert.match(m.name, /animation\.mp4$/); }); }
  else console.log("skip MP4: no H.264 encoder in this browser");
  if (enc.webm) { const w = await run("webm", "720", "24", "9:16");
    check("WebM: EBML file, vertical 9:16", () => { assert.strictEqual(w.buf.readUInt32BE(0), 0x1A45DFA3); assert.match(w.name, /animation-9x16\.webm$/); }); }
  check("at least one video format is available in Chromium", () => assert.ok(enc.mp4 || enc.webm));
  await p.click("#moExCancel");

  const after = await p.evaluate(() => JSON.stringify(__atelier.layers));
  check("exporting never changes the drawing", () => assert.strictEqual(after, before));

  const ph = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const m = await ph.newPage(); m.on("pageerror", e => errors.push("mobile: " + e.message));
  await m.addInitScript(() => { try { localStorage.setItem("atelier-logo-welcome-later", "1"); } catch (_) {} });
  await m.goto(p.url()); await m.waitForFunction(() => window.__motion); await m.evaluate(() => __motion.open());
  await m.tap("#moExport"); const shown = await m.isVisible("#moExDlg[open] #moExGo");
  const fits = await m.evaluate(() => document.querySelector("#moExDlg").getBoundingClientRect().right <= innerWidth);
  check("phone: the export dialog opens and fits the screen", () => assert.ok(shown && fits));
  await ph.close();

  await ctx.close(); await browser.close();
  done(errors);
})();
