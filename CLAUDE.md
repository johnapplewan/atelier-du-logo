# Atelier du Logo par John Apple : consignes

- The UI copy is in French. Code, identifiers and comments are in English. The signature is "par John Apple", with the subtitle « par John Apple · édition vectorielle ».
- Only `src/template.html` (and `src/sw.js`) get edited. `app/index.html`, `app/sw.js` and `app/files.json` are regenerated with `npm run build`. Never hand-edit the generated files.
- Before every push, run `npm run build` and then `npm test`. The tests use Playwright Chromium; `require('playwright')` works out of the box in cloud sessions.
- Artifact: "Atelier du Logo par John Apple", slug `34fe3d22-be59-4687-8ad9-1e04ebd84e64`.
  - Publish `app/` with `publish_files`, as a patch.
  - Declared capabilities: db (read view, write admin), comments, downloads, assets.
- Never break a user's curves. Claude's edits always go through the patch channel (`atelier/patch`) with the undo banner.

## Goal

Make the workshop a distributable tool. Anyone should be able to load it as an artifact, or through a skill, and design their logo and brand book with Claude.

## Default example

- The default drawing is the workshop's own logo, stylised design version (`buildOriginal`, `ORIGIN_GROUPS`, `ORIGIN_PALS`): construction lines, measures, the mark in pencil (left) and rendered (right: brushed-metal edge of 16 stacked slices, lacquered top, raised curve and handles), « ATELIER » (the word, Montserrat SemiBold capitals laid out by `build.js`) and « DU LOGO » (text block `txt-origine`). The pencil → render transition uses the `fondu` / `efface` effects. Brand-book (official) versions: `docs/charte/` (no measures, no pencil).
- Most tests run on the former neutral example (« Marque »), seeded from `tests/fixtures/example-marque.json` by `tests/helpers.js`; pass `{ fresh: true }` to `open()` to test the real default.

## Styles

- Layer effects are data (`L.fx = [{t, a, c?}]`, max 4; includes `degrade` colour gradient, `brosse` brushed metal, `fondu` / `efface` left-to-right sweeps placed on the whole drawing's width) rendered by `applyFx` inside `layerSVG`, so canvas, previews and exports match. Transformations rewrite curves into new layers (own group + palette). When Claude edits a styled layer through a patch, keep its `fx` unless asked.

## Motion (animation module)

- Twin module to animate the open project's logo (~5 s, 1–12 s). Source: `src/motion.js`, inlined by `build.js` at `/*__MOTION__*/` in the workshop script. It only reads the drawing (renders each visible layer once with `layerSVG`, then sets opacity / transform per frame) and never edits layers; it must not break the workshop.
- Data: `doc.motion = {v:1, dur, loop, anims}` (`validMotion`, `validAnim`, `motionNow`, `motionLoad`), saved with the project (`docNow` / `loadDoc`) and the local cache (`palDoc.mo`). Opened by « Animer » (`openMotion`); keys are captured while open (own undo stack). Tests: `tests/motion.js`, `tests/motion2.js`, `tests/motion3.js`, `tests/motion4.js`, `tests/motion5.js`, `tests/motion6.js`.
- Animations: `anims = [{id, p, k:in|out|mo|cam, ids, at, len, stg, ease, ord, o}]`; `p` is a key of `MO_PRESETS` (fn → partial state o/x/y/s/sx/ky/r/blur/liq/draw/clip, `feat` trace / clip / filter), settings in `MO_PARAMS` (sliders), curves in `MO_EASES`, order in `MO_ORDERS`. One entry covers several layers with a stagger; the camera targets `__scene`. With no animation, a provisional automatic preview plays.
- Timeline (`moTl`, one row per animation: drag the bar = start, its ends = timing, ruler = playhead; snapped to frames, Alt = free); hidden on phones. Free keyframes: `k:"key"`, `p:"cles"`, `keys:[{t,o,x,y,s,r,e}]` (`MO_KF`, `moKeyAt`, `moKeySync` keeps `at`/`len`). Custom curves: `ease:"perso"` + `bz:[x1,y1,x2,y2]` (`moBezier`, editor `moBzEditor`).
- Recipes (`MO_RECIPES`, `moRecipe`, `moApplyRecipe`): read the drawing (`moParts`: symbol, text blocks top to bottom, sketch / render layers) and write a whole set of animations in fractions of the duration; they replace the current ones (asks first, undoable). « Du croquis au rendu » traces open lines, fades measures, traces the pencil (`efface`) layers, then animates the sweep position of `fondu` / `efface` (preset `balayage`, state `sweep`, gradients `mo-fx-<layer>-<k>g` updated per frame), one sweep per fx position (symbol, then text).
- Exports (`openMotionExport`, dialog `#moExDlg`): MP4 / WebM via WebCodecs + `app/vendor/mp4-muxer.js` / `webm-muxer.js` (MIT, loaded on demand), GIF by our own encoder (`moEncodeGif`: per-frame median-cut palette, changed rectangle only, LZW), animated SVG (`moExportSVG`: samples the stage and writes SMIL `<animate>` / `<animateTransform>`, keys thinned by `moThin`). Frames come from `moFrameSVG` (the stage serialised, rasterised through an `<img>`). Framing per aspect: `moViewBox`. To keep the SVG export exact, `moRender` always sets filter / clip / trace attributes (neutral values when idle). Videos carry the soundtrack (AAC, else Opus, in MP4; Opus in WebM); « WAV (son seul) » exports it alone.
- Sound (`motion.audio = {on, vol, fx:{rev,echo,filt,lo,mid,hi,comp}, clips:[{id,s,at,gain,pitch,fi,fo,cut,len?}]}`, `validAudio` / `validClip`). Two banks: the workshop's own sounds synthesised in the browser (`MO_SYNTH`, ids `syn:<name>`, no rights issue) and « Mes sons » imported by the user (`moImportSounds`: rights box required, audio extensions only, 15 MB / 60 s per sound, zip read with limits, every file must decode; kept in IndexedDB `atelier-sons`, stores `meta` and `data`; ids `u:<sha1>`), never bundled or sent anywhere. Each sound has its peak `pk` and a level gain `g` (`moAnalyse`). The generator (`moGenerate`, ambiances `MO_AMB`) reads the key moments (`moMoments`: first appearance, climax = end of the last sweep or of the last appearance, letters, exits) and puts each sound's peak on a moment, preferring « Mes sons ». Playback and offline render share `moChain` (EQ, filter, compressor, echo and reverb sends, master volume) and `moSchedule`. Undo snapshots cover animations and sound (`moSnap` / `moRestore`). The VideoEditingSFX free pack the author uses may not be redistributed as a sound library: never commit it or ship it in the app; users import their own sounds.
- Plan: 1 foundations (done) · 2 presets per layer with sliders (done) · 3 timeline, keys, custom easing curves (done) · 4 one-click recipes (incl. « Du croquis au rendu ») (done) · 5 exports WebM / MP4 / GIF / animated SVG (done) · 6 sound: synthesised bank + « Mes sons » import, generator on key moments, editable track, Web Audio effects (done) · 7 secure import (logo in layers, sound) + terms of use · phone: preview, recipes, quick presets, export; tablet: everything. Later: home with loading animation and « Crée ton logo / Anime ton logo ».

## Hosting

- GitHub Pages (`.github/workflows/pages.yml`, build then deploy jobs) serves `app/` only.
- Cloudflare Worker (live: https://atelier-du-logo.johnapplewan.workers.dev): `wrangler.jsonc` serves `site/`, built by `build-site.js` (called by `build.js`; `site/` is git-ignored): public pages from `site-src/` (`layout.html`, `site.css`, `pages/*.html` with a `<!--meta {...} -->` header, `assets/`; the guide page is `GUIDE.md` converted) at the root, the workshop copied under `/atelier/`, `_headers` (CSP, frame-ancestors, microphone allowed for voice bubbles), a root `sw.js` that retires the earlier root service worker, sitemap, robots, 404. Steps and the Wero build secret: `docs/CLOUDFLARE.md`. Account pages are UI only (no backend yet). Test: `tests/site.js`.
- The landing animation `site-src/assets/hero-anim.svg` is made by the app's own animated SVG export (« Du croquis au rendu », 7 s, no loop).
- Front-end architecture and design constraints for a future redesign: `docs/ARCHITECTURE-FRONT.md`.

## History

- `hist` entries store per-layer diffs (`d.ents[id] = [before, after]` as stable JSON, plus order and palettes). `toggleEntry` puts a property back only if it still holds this entry's value, so later changes are never overwritten. Use `commit(before, label)` with a clear French label for new actions; Claude's patches are recorded as "Claude : <note>". The history is saved in the project (`doc.hist`).

## Premium concepts

- `PREMIUM_CATALOG` (36 entries: layout × container × variant × dark) feeds `premiumPlanFor` / `buildPremium`, built from `DESIGN-RULES.md`; `conceptPlan` adds an illustrated catalogue (styles × compositions, illustrated seals/emblems) and shows 5 + 4 per round (`conceptPlan.counts`). Circular text: `arcText`. Refined pictograms: `FINE` (monoline SVG paths, `placeFine`, lines are `open` layers with `sw`), preferred by premium layouts; `ICONS` (filled) stay for illustrated styles. `parsePathD(d, {open:true})` keeps open-path ends (only Z closes). Never style a `motif-provisoire` placeholder (Claude draws it).
- Earlier summary: (read it before changing them): two colours, tracked capitals (`textLine`), flat symbols, monograms cut out of their frame (`knockout`, nonzero winding), tile backgrounds in the previews. They come before the illustrated concepts (`conceptPlan`). Keep the rules file, the generator and the skill's « Design rules » section in step.

## Brand book

- Answers live in `brand.book` (theme, format, colour roles, title/body fonts, mood, voice, sections, site, email). Pages are SVG built by `bookPages(cfg)`; all text is drawn from glyph files (`tx`, `para`), so the PDF shows the exact typefaces. `buildPdf` writes the PDF itself (one JPEG per page); `buildBookZip` makes the deposit pack.

## Storage

- Projects and collections live on the user's device (IndexedDB `atelier-logo`, localStorage fallback); files `.atelier.json` (`format: "atelier-logo"`) carry projects between devices.
- The open project is the live drawing: cached in localStorage (`atelier-logo-v1`, `-palette`) and shared with Claude through the artifact db (`atelier/shape`, `atelier/notes`, `atelier/palette`, `atelier/patch`). Claude only ever edits the open project.

## To do (first pass)

1. **Remove Simulimmo.**
   - Default document: a blank page, or a neutral example to pick from.
   - Neutral default word, typed by the user on first open.
   - Remove the 9-letter "Simulimmo" check (`perLetterOK`, `applyFont`, `wordText`).
   - Export names should derive from the brand name the user enters.
   - Use neutral localStorage keys.
   - Change the header mark.
   - Neutral palette: the workshop UI keeps its own look, separate from the logo being edited.
2. **Fonts.** The fonts must re-shape the word the user types. Today `fonts.js` is prebaked for "Simulimmo", so one-click previews are tied to that word.
3. **First open.** Ask for the brand name, the tagline and a few keywords; offer the typed word, a few starting shapes, an imported image, logo concepts generated from the keywords (subjects -> pictograms, material, style + matching typeface, supports; a subject outside the library becomes a placeholder + bubble brief for Claude to draw), the example; "Page vierge" is a plain text link next to "Plus tard".
   - **Import and vectorise**: a JPEG/PNG, a photo of a hand drawing or a signature. Remove the paper texture and shadows, trace the contours, fit editable Bézier curves (detail slider, thin-stroke mode for signatures).
   - Two sources: pick a file, or take a photo. The artifact frame refuses getUserMedia (camera), so "Prendre une photo" is `<input type="file" accept="image/*" capture="environment">`: it opens the camera on tablets and phones; on a computer it opens the file picker (photo taken with the webcam app, or dropped in).
   - Uses: signature logo / photo watermark (transparent PNG), seamless textures and patterns (tile preview, pattern export).
4. **Brand book.** (done: questionnaire, pages, PDF, deposit pack) Generate the brand-book page (logo variants, backgrounds, colours, type, clear space, deposit files) from the user's logo, as was done for Simulimmo.
   - Before generating, once the logo is done: a series of questions with choices to pick (style, exact colours, type, mood), so the book matches what the user wants rather than Claude's defaults.
   - PDF export: A4 portrait for print, and landscape for slides.
5. **Distribution.** (done: `skill/atelier-du-logo/SKILL.md`, zipped into `app/downloads/atelier-du-logo-skill.zip` by `npm run mcpb`; `GUIDE.md`)
   - A skill (`SKILL.md`) that tells Claude how to open the workshop in a new conversation and how to work with it: read the bubbles, send patches.
   - A short user guide.
6. **Pen and pencil.** (done) Bézier handles visible on demand (all handles toggle, Alt+drag pulls handles out of a node); a real pen tool that creates paths (click = corner, click-drag = curve, click the first point = close, Enter/Escape = open path); a freehand pencil (stylus pressure; "Trait" = editable stroke, "Pinceau" = filled brush shape), smoothed into editable curves. Open paths are stroked layers (`L.open`, `L.sw`).
7. **Typefaces.** (done) Import a TTF/OTF/WOFF; duplicate an existing typeface and edit its glyphs with the pen/pencil; create a typeface from a blank glyph grid; export as OTF (opentype.js, MIT, bundled).
8. **Standalone app.** (done) Installable PWA that works offline (vendor JSZip and UI fonts), zip download + files ready for GitHub Pages; panels (tools, layers, selection, palette, notes) can be detached into windows on several screens. The panel DOM is moved into a same-origin window and stays driven by the main script (`PANELS`, `detachPanel`, `attachPanel`): `document.querySelector(All)` also searches panel windows and keyboard/pointer listeners are mirrored, so there is no state to sync.
9. **Claude connections** (done; outside the artifact: copy-paste and the Claude Desktop extension only. The API-key option was removed on purpose: the workshop never stores or sends an Anthropic key, and erases one left by an older version). One format for all: `claudePrompt` / `claudeContext` (layers as SVG paths, bubbles) and `applyClaudeReply` (`{note, calques:[{id,d,couleur,nom,groupe}], supprimer, reponses:[{n,texte,fait}]}`, `parsePathD`), with the undo banner and a "Claude : note" history entry. The extension (`tools/mcpb`, packed into `app/downloads/atelier-du-logo.mcpb`) bundles a copy of `app/`: run `npm run mcpb` after `npm run build` when the app changes. Original brief: copy/paste with claude.ai (free; paste the reply back as a patch); MCP via a one-click Claude Desktop extension (local server on localhost: serves the app offline, bridges tools such as read bubbles, render preview, send patch; uses the user's plan, settings and skills).

