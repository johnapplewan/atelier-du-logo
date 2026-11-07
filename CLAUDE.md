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
3. **First open.** Ask for the brand name, the tagline and a few keywords; offer a blank start or a few starting shapes.
4. **Brand book.** Generate the brand-book page (logo variants, backgrounds, colours, type, clear space, deposit files) from the user's logo, as was done for Simulimmo.
5. **Distribution.**
   - A skill (`SKILL.md`) that tells Claude how to open the workshop in a new conversation and how to work with it: read the bubbles, send patches.
   - A short user guide.
