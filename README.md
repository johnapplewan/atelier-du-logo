# Atelier du Logo par John Apple

Un éditeur vectoriel de logo et de charte graphique qui s'utilise avec Claude. On l'ouvre comme artifact dans une conversation, on dessine, on pose des bulles pour demander des retouches, et Claude modifie le logo directement dans l'outil.

> Statut : copie de travail de l'atelier conçu pour Simulimmo, en cours de nettoyage (voir « Reste à faire »).

## Fonctions

- **Calques et groupes** : renommage, masquage et verrouillage en lot, sélection par plage avec Maj, opacité, modes de fusion.
- **Plume Bézier** : sélection de plusieurs points, raccourcis de précision.
- **Formes, rotation et redimensionnement** : avec ou sans proportions.
- **Dégradés** : linéaire, radial et 4 points.
- **Palettes par zones** : pipette, suggestions, une palette par groupe.
- **56 polices libres** : latin, cyrillique, arabe, hébreu, devanagari, thaï, CJK, hiéroglyphes, pictogrammes.
- **Clavier international** : clavier à l'écran, saisie pinyin et romaji, sens auto, de droite à gauche ou vertical.
- **Bulles d'annotation** (texte et voix), envoyées à Claude. Les retouches de Claude arrivent avec un bandeau pour les annuler.
- **Export** : SVG, PNG et JPG, par groupe ou par calque, en ZIP.

## Arborescence

| Dossier | Contenu |
|---|---|
| `app/` | Ce qui est publié comme artifact : `index.html` (généré), `fonts.js`, `glyphs/`, `dict-*.js` |
| `src/template.html` | Source de l'application |
| `build.js` | `npm run build` : `src/template.html` + `tools/word/glyphs.json` → `app/index.html` |
| `tools/word/` | Contours du mot par défaut (opentype.js) |
| `tools/fonts/` | Chaîne des polices (harfbuzzjs + opentype.js) : `gen.mjs` → `fonts.js`, `glyphs.cjs` → `app/glyphs/`, `dicts.cjs` → `app/dict-*.js` |
| `tests/` | Scripts Playwright sur `app/index.html` (Chromium) |

## Licences

Le code est sous licence MIT. Les polices sont libres (SIL OFL 1.1 ou Apache 2.0) et converties en contours. Les dictionnaires viennent de CC-CEDICT (CC BY-SA) et de KANJIDIC (CC BY-SA).
