// Motion module, step 6: sound. The workshop's own synthesised sounds; the generator places them on the animation's
// key moments (a sound's peak on the moment); the track is edited (cards, timeline) and undone; master effects; the
// sound is rendered offline into WAV and into MP4 / WebM; « Mes sons »: secure import (rights box, audio only, zip),
// kept on this device; data checked on import.
const { chromium, assert, open, check, done } = require("./helpers");
const fs = require("fs"), path = require("path"), os = require("os");

// a short WAV (a 440 Hz beep with its loudest moment at 0.3 s)
function beepWav(sec = .6) {
  const sr = 22050, n = Math.round(sec * sr), b = Buffer.alloc(44 + n * 2);
  b.write("RIFF", 0); b.writeUInt32LE(36 + n * 2, 4); b.write("WAVE", 8); b.write("fmt ", 12); b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22);
  b.writeUInt32LE(sr, 24); b.writeUInt32LE(sr * 2, 28); b.writeUInt16LE(2, 32); b.writeUInt16LE(16, 34); b.write("data", 36); b.writeUInt32LE(n * 2, 40);
  for (let i = 0; i < n; i++) { const t = i / sr, env = Math.exp(-Math.pow((t - .3) / .08, 2)); b.writeInt16LE(Math.round(Math.sin(2 * Math.PI * 440 * t) * env * 20000), 44 + i * 2); }
  return b;
}

(async () => {
  const browser = await chromium.launch({ args: ["--autoplay-policy=no-user-gesture-required"] });
  const { ctx, page: p, errors } = await open(browser, { fresh: true, context: { acceptDownloads: true } });
  await p.click("#motionBtn"); await p.waitForSelector("#motion:not([hidden])"); await p.click("#moPlay");
  await p.click('[data-recipe="croquis"]'); await p.click("#moPlay");

  const syn = await p.evaluate(() => [...document.querySelectorAll("#moAmb option")].map(o => o.value));
  check("five ambiances for the soundtrack", () => assert.deepStrictEqual(syn, ["cinema", "elegant", "dynamic", "minimal", "tech"]));

  await p.selectOption("#moAmb", "cinema"); await p.click("#moGen"); await p.waitForTimeout(600); await p.click("#moPlay");
  const g = await p.evaluate(() => { const m = __motion.state.motion, sw = m.anims.filter(a => a.p === "balayage"), climax = Math.max(...sw.map(a => a.at + a.len));
    return { clips: m.audio.clips, climax, on: m.audio.on, valid: __motion.valid(m), meta: m.audio.clips.map(c => __motion.soundMeta(c.s)) }; });
  const hit = g.clips.find((c, i) => g.meta[i].cat === "impact"), hm = g.meta[g.clips.indexOf(hit)];
  check("« Cinématique » : a rise into the climax, an impact whose peak lands on it (end of the last sweep)", () => {
    assert.ok(g.on && g.valid && g.clips.length >= 3, JSON.stringify(g.clips)); assert.ok(g.meta.some(m => m.cat === "riser"));
    assert.ok(hit && Math.abs(hit.at + hm.pk - g.climax) < 0.02, JSON.stringify({ hit, hm, climax: g.climax })); });
  const rows = await p.locator("#moTlIn .mo-tr[data-clip]").count(), cards = await p.locator("#moClips .mo-clip").count();
  check("each sound has a row on the timeline and a card", () => { assert.strictEqual(rows, g.clips.length); assert.strictEqual(cards, g.clips.length); });

  // sound rendered offline: not silent, and its loud part is around the climax
  const r = await p.evaluate(async c => { const buf = await __motion.renderAudio(), d = buf.getChannelData(0), sr = buf.sampleRate; let peak = 0, at = 0;
    for (let i = 0; i < d.length; i++) { const v = Math.abs(d[i]); if (v > peak) { peak = v; at = i / sr; } } return { peak, at, len: buf.duration }; }, g.climax);
  check("the soundtrack renders offline: audible, loudest near the climax, as long as the animation", () => {
    assert.ok(r.peak > .05, JSON.stringify(r)); assert.ok(Math.abs(r.at - g.climax) < .6, JSON.stringify(r)); assert.ok(Math.abs(r.len - 5) < .01); });

  // edit a sound in its card, then undo
  const c0 = g.clips[0];
  await p.evaluate(id => { const d = document.querySelector(`.mo-clip[data-clip="${id}"]`); d.open = true; const r = d.querySelector('input[data-ck="gain"]'); r.value = "-12"; r.dispatchEvent(new Event("input", { bubbles: true })); r.dispatchEvent(new Event("change", { bubbles: true })); }, c0.id);
  const g1 = await p.evaluate(() => __motion.state.motion.audio.clips[0].gain);
  await p.keyboard.press("Control+z");
  const g2 = await p.evaluate(() => __motion.state.motion.audio.clips[0].gain);
  check("a sound's volume changes in its card; Ctrl+Z puts it back", () => { assert.strictEqual(g1, -12); assert.strictEqual(g2, c0.gain); });

  // drag a sound on the timeline
  const bar = await p.locator(`#moTlIn .mo-tr[data-clip="${c0.id}"] .mo-bar2`).boundingBox(), ruler = await p.locator("[data-ruler]").boundingBox();
  await p.mouse.move(bar.x + bar.width / 2, bar.y + bar.height / 2); await p.mouse.down(); await p.mouse.move(bar.x + bar.width / 2 + ruler.width / 10, bar.y + bar.height / 2, { steps: 4 }); await p.mouse.up();
  const moved = await p.evaluate(id => __motion.state.motion.audio.clips.find(c => c.id === id).at, c0.id);
  check("dragging a sound on the timeline moves it (0.5 s)", () => assert.ok(Math.abs(moved - (c0.at + .5)) < .05, moved + " vs " + c0.at));

  // master effects
  await p.evaluate(() => { document.querySelector("#moFxBox").open = true; const r = document.querySelector('#moFx input[data-fx="echo"]'); r.value = "40"; r.dispatchEvent(new Event("input", { bubbles: true })); r.dispatchEvent(new Event("change", { bubbles: true })); });
  const fx = await p.evaluate(() => __motion.state.motion.audio.fx.echo);
  check("master effects (echo, reverb, filter, EQ, compressor) are set in « Effets »", () => assert.strictEqual(fx, 40));

  // WAV and MP4 with sound
  await p.click("#moExport"); await p.waitForSelector("#moExDlg[open]");
  const exp = async (fmt, size) => { await p.check(`input[name=moexf][value=${fmt}]`); if (size) { await p.selectOption("#moExSize", size); await p.selectOption("#moExFps", "24"); }
    const [dl] = await Promise.all([p.waitForEvent("download", { timeout: 180000 }), p.click("#moExGo")]); const f = await dl.path();
    await p.waitForFunction(() => /Enregistré/.test(document.querySelector("#moExMsg").textContent)); return { buf: fs.readFileSync(f), name: dl.suggestedFilename(), msg: await p.textContent("#moExMsg") }; };
  const w = await exp("wav");
  check("« WAV (son seul) » : a 48 kHz stereo WAV of the whole animation", () => { assert.strictEqual(w.buf.slice(0, 4).toString(), "RIFF"); assert.strictEqual(w.buf.readUInt32LE(24), 48000); assert.strictEqual(w.buf.readUInt16LE(22), 2);
    assert.ok(Math.abs(w.buf.readUInt32LE(40) / (48000 * 4) - 5) < .01); assert.match(w.name, /\.wav$/); });
  await p.fill("#moDur", "2").catch(() => {});
  await p.evaluate(() => { const r = document.querySelector("#moDur"); r.value = "2"; r.dispatchEvent(new Event("input", { bubbles: true })); });
  const v = await exp("mp4", "720");
  check("MP4 export carries the soundtrack (AAC or Opus)", () => { assert.ok(v.buf.includes(Buffer.from("mp4a")) || v.buf.includes(Buffer.from("Opus")), "no audio track"); assert.match(v.msg, /Avec le son/); });
  const wb = await exp("webm", "720");
  check("WebM export carries the soundtrack (Opus)", () => { assert.ok(wb.buf.includes(Buffer.from("A_OPUS"))); });
  await p.click("#moExCancel");

  // « Mes sons » : secure import
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "sons-")), wav = path.join(dir, "Impact maison.wav"), bad = path.join(dir, "pas un son.mp3"), txt = path.join(dir, "notes.txt");
  fs.writeFileSync(wav, beepWav()); fs.writeFileSync(bad, "ceci n'est pas un son"); fs.writeFileSync(txt, "texte");
  await p.click("#moBankBtn"); await p.waitForSelector("#moBankDlg[open]");
  const locked = await p.evaluate(() => document.querySelector("#moImpBtn").disabled);
  check("importing needs the rights box ticked first", () => assert.ok(locked));
  await p.check("#moRights");
  await p.setInputFiles("#moImpIn", [wav, bad, txt]);
  await p.waitForFunction(() => /ajouté/.test(document.querySelector("#moImpMsg").textContent));
  const im = await p.evaluate(async () => { const t = document.querySelector("#moImpMsg").textContent, u = __motion.userSounds();
    return { t, n: u.length, m: u[0], rows: document.querySelectorAll("#moBankList .it [data-bact=del]").length }; });
  check("import: the WAV is kept (named, sorted as an impact, peak measured), the fake MP3 and the text file are refused", () => {
    assert.strictEqual(im.n, 1); assert.match(im.t, /1 son ajouté.*2 fichiers ignorés/); assert.strictEqual(im.m.n, "Impact maison"); assert.strictEqual(im.m.cat, "impact");
    assert.ok(Math.abs(im.m.pk - .3) < .06, JSON.stringify(im.m)); assert.strictEqual(im.rows, 1); });
  // a zip of sounds
  const zip = await p.evaluate(async () => { const JSZip = await loadJSZip(), z = new JSZip(); const r = await fetch("data:audio/wav;base64," + __b64); z.file("Pack/Whoosh/Swoosh rapide.wav", await r.arrayBuffer()); z.file("Pack/lisezmoi.txt", "x"); z.file("__MACOSX/._x.wav", "x");
    return Array.from(new Uint8Array(await z.generateAsync({ type: "uint8array" }))); }).catch(e => null);
  if (zip === null) {
    await p.evaluate(b64 => { window.__b64 = b64; }, beepWav(.4).toString("base64"));
    const zz = await p.evaluate(async () => { const JSZip = await loadJSZip(), z = new JSZip(); const bin = Uint8Array.from(atob(window.__b64), c => c.charCodeAt(0)); z.file("Pack/Whoosh/Swoosh rapide.wav", bin); z.file("Pack/lisezmoi.txt", "x"); z.file("__MACOSX/._x.wav", "x");
      return Array.from(await z.generateAsync({ type: "uint8array" })); });
    fs.writeFileSync(path.join(dir, "pack.zip"), Buffer.from(zz));
  } else fs.writeFileSync(path.join(dir, "pack.zip"), Buffer.from(zip));
  await p.setInputFiles("#moImpIn", [path.join(dir, "pack.zip")]);
  await p.waitForFunction(() => __motion.userSounds().length === 2);
  const z = await p.evaluate(() => __motion.userSounds().map(m => [m.n, m.cat]));
  check("a .zip of sounds imports its audio files (category from the folder), skipping the rest", () => assert.deepStrictEqual(z.sort(), [["Impact maison", "impact"], ["Swoosh rapide", "whoosh"]]));
  // add one of my sounds at the playhead
  await p.evaluate(() => __motion.seek(1));
  const n0 = await p.evaluate(() => __motion.state.motion.audio.clips.length);
  await p.click('#moBankList [data-bact="add"][data-id^="u:"]');
  const added = await p.evaluate(() => __motion.state.motion.audio.clips.slice(-1)[0]);
  check("« + Ajouter » puts the sound at the playhead", () => { assert.ok(/^u:/.test(added.s)); assert.strictEqual(added.at, 1); });
  await p.click("#moBankClose");
  // the generator prefers my own sounds
  await p.selectOption("#moAmb", "minimal"); await p.click("#moGen"); await p.waitForTimeout(400); await p.click("#moPlay");
  const mine = await p.evaluate(() => __motion.state.motion.audio.clips.map(c => c.s));
  check("the generator uses « Mes sons » when they fit the moment", () => assert.ok(mine.some(s => s.startsWith("u:")), JSON.stringify(mine)));

  const val = await p.evaluate(() => { const base = { v: 1, dur: 5, anims: [] }, A = s => Object.assign({}, base, { audio: Object.assign({ on: true, vol: .9, fx: { rev: 0, echo: 0, filt: 0, lo: 0, mid: 0, hi: 0, comp: true }, clips: [] }, s) });
    const c = x => A({ clips: [Object.assign({ id: "c1", s: "syn:pop", at: 0, gain: 0, pitch: 0, fi: 0, fo: 0, cut: 0 }, x)] });
    return [__motion.valid(c({})), __motion.valid(c({ s: "https://exemple.fr/son.mp3" })), __motion.valid(c({ gain: 99 })), __motion.valid(A({ vol: 9 })), __motion.valid(c({ id: "<x>" }))]; });
  check("sound data is checked on import (sound ids, levels, volume)", () => assert.deepStrictEqual(val, [true, false, false, false, false]));

  await ctx.close(); await browser.close();
  done(errors);
})();
