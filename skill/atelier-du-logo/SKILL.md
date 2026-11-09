---
name: atelier-du-logo
description: Work with the Atelier du Logo (par John Apple), a vector logo and brand-book editor, to design or edit a user's logo with them. Use when the user mentions the Atelier du Logo, their logo "dans l'atelier", annotation bubbles (bulles) to process, pastes a request that starts with "Bonjour Claude. Je dessine mon logo dans l'Atelier du Logo", or when atelier_* tools are available.
---

# Atelier du Logo

The Atelier du Logo is a vector editor where people draw their logo and brand book. They pin **bubbles** (bulles) on the drawing to ask for changes; you read them, look at the logo, change the curves and answer each bubble. The user always keeps control: every change you make arrives with a banner « Annuler la modification de Claude » and an entry « Claude : <note> » in the project history.

Speak the user's language (the interface is French). Never invent changes nobody asked for; when a bubble is unclear, answer it with a question instead of guessing.

## 1. Find how you are connected

Check in this order and use the first that applies:

1. **Claude Desktop extension**: tools `atelier_ouvrir`, `atelier_etat`, `atelier_apercu`, `atelier_svg`, `atelier_appliquer` are available. Go to section 2.
2. **Pasted request**: the user pasted a message starting with « Bonjour Claude. Je dessine mon logo dans l'Atelier du Logo » followed by a ```json block. Go to section 3.
3. **Artifact**: the conversation has the « Atelier du Logo par John Apple » artifact and you can use its database (db_get / db_write on `atelier/shape`, `atelier/notes`, `atelier/patch`). Go to section 4.
4. **None of these**: tell the user how to start, then stop:
   - open the workshop at https://johnapplewan.github.io/atelier-du-logo/ (works in any browser, installable, offline);
   - to work with you directly: install the Claude Desktop extension (« Connexions Claude » › Claude Desktop in the workshop), or use « Copier la demande » and paste it here.

## 2. Claude Desktop extension

1. `atelier_etat`. If it says the workshop is not open, call `atelier_ouvrir` and ask the user to tell you when the page is open.
2. Read `bulles` (open requests, each with `n`, position and target `calque`) and `calques` (each layer: `id`, `nom`, `groupe`, `couleur`, `d` path, `verrouille` if locked).
3. `atelier_apercu` to see the logo before changing anything.
4. `atelier_appliquer` with the reply format (section 5). Answer every bubble you handled in `reponses`.
5. `atelier_apercu` again and check the result looks right. If not, fix it with another `atelier_appliquer`; the user can undo either step.

If the user asks for something without a bubble (« rends le symbole plus rond »), do the same: state, preview, apply, preview.

## 3. Pasted request (claude.ai, copy-paste)

The json block holds `marque`, `palette`, `calques` (with `d` paths) and `bulles`. Work out the changes, explain them in a few sentences, then end your answer with **one** ```json block in the reply format (section 5). The user copies your whole answer and uses « Coller la réponse » in the workshop. Put nothing after the block that could be mistaken for json.

## 4. Artifact (Atelier du Logo par John Apple)

- Read the drawing: `db_get atelier/shape` → `{data: JSON string of layers, at}`. A layer is `{id, name, group: "mark"|"word", fill, zone?, subs, open?, sw?, fx?, locked, visible}`; `subs` is a list of contours, each a list of nodes `{x, y, i, o}` (cubic handles, absolute, or null).
- Read the bubbles: `db_get atelier/notes` → `{data: JSON string of [{id, n, x, y, text, reply?, done?}], at}`.
- Change the drawing **only** through `atelier/patch`, with `db_write`: `{"at": <Date.now() in ms, larger than any previous patch>, "reply": "<JSON string of the reply format>"}`. Never overwrite `atelier/shape`: the patch channel is what shows the undo banner and keeps the user's other layers safe.
- Bubble answers go in `reponses` of the reply (the page writes them into the notes).
- The older form `{"at", "note", "layers": "<JSON string of [{id, subs, fill?, name?}]>"}` still works for edits of existing layers.

## 5. Reply format (all connections)

```json
{
  "note": "short summary shown to the user",
  "calques": [ { "id": "existing or new id", "d": "M… C… Z", "couleur": "#RRGGBB", "nom": "readable name", "groupe": "symbole" } ],
  "supprimer": [ "layer id" ],
  "reponses": [ { "n": 1, "texte": "answer shown in bubble 1", "fait": true } ]
}
```

- Only list layers you change or add. A missing field (`d`, `couleur`, `nom`) stays as it is. An unknown `id` creates a layer; give it `groupe` (`symbole` or `mot`).
- `d`: absolute coordinates, commands M L H V C S Q T Z only (no arcs `A`: use cubic C curves). Close shapes with Z. Keep paths clean: few nodes, smooth curves, the same style as the rest of the logo.
- Coordinates: the symbol lives in the 0..256 square on the left, the word starts around x = 300, y grows downwards.
- Locked layers (`verrouille: true`) are never changed: tell the user if a bubble needs one unlocked.
- Layer effects (`effets`) are kept when you change a layer's path.
- `fait: false` leaves a bubble open (for a question back to the user).

## Good practice

- Look before and after (preview image or the paths). Small, precise steps beat one large rewrite.
- Respect the brand (`marque`: name, tagline, keywords) and the palette; only introduce a new colour when asked.
- Never delete or replace the user's layers unless a bubble asks for it.
