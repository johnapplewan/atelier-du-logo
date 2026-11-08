// Export: group to SVG / PNG / JPG through the downloads capability, file names from the word, zip contents.
const { chromium, assert, open, check, done } = require("./helpers");

(async () => {
  const browser = await chromium.launch();
  const { page: p, errors } = await open(browser, {
    context: { viewport: { width: 1300, height: 900 } },
    init: () => {
      window.__saved = [];
      window.claude = { use: async n => n === "downloads" ? { save: async ({ filename, data }) => {
        const size = data.size !== undefined ? data.size : data.length;
        const head = data.arrayBuffer ? Array.from(new Uint8Array(await data.slice(0, 4).arrayBuffer())).map(x => x.toString(16)).join(" ") : data.slice(0, 4);
        window.__saved.push([filename, size, head]); return { status: "saved" };
      } } : null };
    },
  });

  // group the disc and the dot
  await p.click('.layer[data-id="disque"] .nm'); await p.click('.layer[data-id="point"] .nm', { modifiers: ["Shift"] });
  await p.keyboard.press("Control+g");
  await p.click("#exportBtn"); await p.check("input[name=exm][value=group]");
  const gsvg = await p.inputValue("#svgcode"), gname = await p.textContent("#exSave");
  check("group export", () => { assert.strictEqual(gsvg.match(/<path/g).length, 2); assert.match(gname, /marque-groupe-1\.svg/); });

  await p.check("input[name=exf][value=png]"); await p.selectOption("#exW", "2048"); await p.click("#exSave"); await p.waitForTimeout(800);
  await p.check("input[name=exf][value=jpg]"); await p.click("#exSave"); await p.waitForTimeout(800);
  await p.check("input[name=exm][value=full]"); await p.check("input[name=exf][value=svg]"); await p.click("#exSave"); await p.waitForTimeout(300);
  const saved = await p.evaluate(() => __saved), bg = await p.inputValue("#exBg");
  check("files saved with brand-derived names", () => assert.deepStrictEqual(saved.map(s => [s[0], s[2]]), [
    ["marque-groupe-1.png", "89 50 4e 47"], ["marque-groupe-1.jpg", "ff d8 ff e0"], ["marque-logo.svg", "<svg"]]));
  check("JPG gets an opaque background", () => assert.strictEqual(bg, "#FFFFFF"));
  await p.screenshot({ path: __dirname + "/s18.png" });

  // zip (JSZip from the CDN; skipped offline)
  const zip = await p.evaluate(async () => {
    try { const b = await __buildZip(false); const z = await JSZip.loadAsync(b); const r = await z.file("LISEZMOI.txt").async("string"); return { files: Object.keys(z.files), readme: r }; }
    catch (e) { return null; }
  });
  if (zip) check("zip names and read-me", () => {
    assert.ok(zip.files.includes("marque-logo.svg") && zip.files.includes("marque-symbole.svg") && zip.files.includes("marque-mot.svg"), zip.files.join());
    assert.match(zip.readme, /Exports du logo Marque/); assert.match(zip.readme, /Instrument Serif/); assert.doesNotMatch(zip.readme, /simulimmo/i);
  });
  else console.log("skip zip (JSZip unreachable)");

  done(errors);
  await browser.close();
})();
