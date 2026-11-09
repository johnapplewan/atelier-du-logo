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

## Styles

- Layer effects are data (`L.fx = [{t, a, c?}]`, max 4) rendered by `applyFx` inside `layerSVG`, so canvas, previews and exports match. Transformations rewrite curves into new layers (own group + palette). When Claude edits a styled layer through a patch, keep its `fx` unless asked.

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

