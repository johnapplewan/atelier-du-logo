# Atelier du Logo par John Apple : consignes

- The UI copy is in French. Code, identifiers and comments are in English. The signature is "par John Apple", with the subtitle « par John Apple · édition vectorielle ».
- Only `src/template.html` gets edited. `app/index.html` is regenerated with `npm run build`. Never hand-edit the generated file.
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
5. **Distribution.**
   - A skill (`SKILL.md`) that tells Claude how to open the workshop in a new conversation and how to work with it: read the bubbles, send patches.
   - A short user guide.
