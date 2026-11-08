# Atelier du Logo par John Apple

Un éditeur vectoriel de logo et de charte graphique qui s'utilise avec Claude. On l'ouvre comme artifact dans une conversation, on dessine, on pose des bulles pour demander des retouches, et Claude modifie le logo directement dans l'outil.

> Statut : en cours de transformation en outil diffusable (voir la liste « To do » de `CLAUDE.md`). L'atelier s'ouvre sur un logo d'exemple neutre (« Marque ») : tapez le nom de votre marque dans « Texte du mot » et toutes les polices se redessinent avec.

## Fonctions

- **Premier lancement** : nom de la marque, slogan, mots-clés, puis point de départ (le nom seul, une forme et le nom, une image ou une photo, page vierge, logo d'exemple). Le bouton « Marque et départ » le rouvre.
- **Import d'image ou de photo** : dessin à la main, signature, texture. Le papier, ses ombres et sa texture sont retirés, les contours deviennent des courbes de Bézier modifiables (réglages Seuil, Détail, Nettoyage, mode trait fin, inversion). Sur tablette, « Prendre une photo » ouvre l'appareil photo.
- **Motifs** : export en mosaïque (grille ou quinconce) ; une image importée comme « motif raccordable » garde son cadre comme case de répétition.
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
| `build.js` | `npm run build` : `src/template.html` + le mot par défaut, dessiné depuis `app/glyphs/instrument.js` → `app/index.html` |
| `tools/fonts/` | Chaîne des polices (harfbuzzjs + opentype.js) : `gen.mjs` puis `trim.cjs` → `fonts.js` (métadonnées seules), `glyphs.cjs` → `app/glyphs/`, `dicts.cjs` → `app/dict-*.js` |
| `tests/` | Tests Playwright (Chromium) sur `app/` servi en local : `npm test` |

## Licences

Le code est sous licence MIT. Les polices sont libres (SIL OFL 1.1 ou Apache 2.0) et converties en contours. Les dictionnaires viennent de CC-CEDICT (CC BY-SA) et de KANJIDIC (CC BY-SA).
