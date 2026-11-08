# Atelier du Logo par John Apple

Un éditeur vectoriel de logo et de charte graphique qui s'utilise avec Claude. On l'ouvre comme artifact dans une conversation, on dessine, on pose des bulles pour demander des retouches, et Claude modifie le logo directement dans l'outil.

> Statut : en cours de transformation en outil diffusable (voir la liste « To do » de `CLAUDE.md`). L'atelier s'ouvre sur un logo d'exemple neutre (« Marque ») : tapez le nom de votre marque dans « Texte du mot » et toutes les polices se redessinent avec.

## Fonctions

- **Premier lancement** : nom de la marque, slogan, mots-clés, puis point de départ : le nom seul, une forme et le nom, une image ou une photo, une proposition de logo (six concepts tirés des mots-clés : sujets illustrés, matière, style et police accordée ; buste, planche gravée, écusson, demi-figure, monogramme entrelacé, monogramme 3D ; un sujet hors bibliothèque devient une bulle-brief pour Claude), le logo d'exemple, ou le lien « Page vierge ». Le bouton « Marque et départ » le rouvre.
- **Import d'image ou de photo** : dessin à la main, signature, texture. Le papier, ses ombres et sa texture sont retirés, les contours deviennent des courbes de Bézier modifiables (réglages Seuil, Détail, Nettoyage, mode trait fin, inversion). Sur tablette, « Prendre une photo » ouvre l'appareil photo.
- **Motifs** : export en mosaïque (grille ou quinconce) ; une image importée comme « motif raccordable » garde son cadre comme case de répétition.
- **Projets et collections**, enregistrés sur l'appareil (IndexedDB du navigateur) : nouveau, ouvrir, dupliquer, renommer, supprimer, recherche ; classement par collection (une par direction artistique) ; copier des calques d'un projet à l'autre (Ctrl+C / Ctrl+V, ou « Calques… » sur une carte) avec leurs couleurs et dégradés ; enregistrer un projet, une collection ou tout dans un fichier `.atelier.json`, et le rouvrir.
- **Styles et stylisation** (inspecteur, sous Fusion) : effets qui gardent les courbes (line art, cerne cartoon, cel-shading, ombre portée, ombre longue, extrusion 3D, relief, gravé en creux, bois massif, métal / dorure, néon, trame, hachures, grain, risographie, papier découpé, verre), transformations qui redessinent (low poly, pixel art, mosaïque / vitrail, pointillisme, dessin à la main, one line, isométrie 2D, arabesques, géométrique, arrondi) et styles complets (flat, cartoon, réaliste, HD-2D, gravé dans le bois, vintage, doré, pop art…).
- **Bibliothèque de pictogrammes** : cerf, bois de cerf, sapin, feuille, montagne, vague, soleil, maison, clé, tasse, blé, plume, oiseau, poisson, fleur, couronne, étoile, cœur, goutte, flamme, marteau, lame de scie, rondin, livre.
- **Historique du projet** : clic sur « Annuler » = annuler ; appui long, clic droit ou ▾ = historique. Chaque modification se décoche et se recoche, dans n'importe quel ordre ; au décochage, on choisit « Seulement cette modification » ou « Celle-ci et les suivantes ». Une propriété modifiée ensuite n'est jamais écrasée (on est prévenu). Survoler une ligne montre les calques touchés. L'historique est enregistré avec le projet.
- **Charte graphique** (bouton « Charte ») : un questionnaire en 5 étapes (style de charte avec aperçus de votre logo, couleurs exactes par rôle, polices des titres et des textes, ambiance et ton, sections et format), puis la charte générée à partir du logo : couverture, marque et ambiance, logo et variantes, zone de protection et tailles minimales, couleurs (HEX, RVB, CMJN, contrastes), typographie, fonds autorisés, à ne pas faire, applications, fichiers fournis. Export PDF (A4 portrait, A4 paysage ou slides 16:9) et pack de dépôt (.zip : variantes SVG et PNG, favicon, PDF, LISEZMOI).
- **Calques et groupes** : renommage, masquage et verrouillage en lot, sélection par plage avec Maj, opacité, modes de fusion.
- **Plume (P)** : crée des tracés (clic = point anguleux, clic-glisser = courbe, clic sur le 1er point = forme fermée, Entrée = trait ouvert). **Points (A)** : modifie les points ; « Afficher toutes les poignées », Alt + glisser un point pour sortir ses poignées, double-clic pour passer un point d'anguleux à lisse. **Crayon (N)** : main levée, lissée en courbes ; mode Trait ou Pinceau sensible à la pression du stylet. Les traits ouverts ont une épaisseur réglable et se convertissent en forme pleine.
- **Formes, rotation et redimensionnement** : avec ou sans proportions.
- **Dégradés** : linéaire, radial et 4 points.
- **Palettes par zones** : pipette, suggestions, une palette par groupe.
- **56 polices libres** : latin, cyrillique, arabe, hébreu, devanagari, thaï, CJK, hiéroglyphes, pictogrammes.
- **Mes polices** (menu F) : importer une police TTF, OTF ou WOFF ; dupliquer une police de l'atelier pour la modifier ; créer sa police à partir d'une grille vide ; chaque glyphe se dessine dans l'atelier (Plume, Crayon, Formes) avec lignes de base, hauteurs et chasse ; export en .otf installable. Les polices restent sur l'appareil et voyagent avec les fichiers de projet.
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
| `app/vendor/` | opentype.js (MIT) : lecture et écriture des fichiers de police |
| `tests/` | Tests Playwright (Chromium) sur `app/` servi en local : `npm test` |

## Licences

Le code est sous licence MIT. Les polices sont libres (SIL OFL 1.1 ou Apache 2.0) et converties en contours. Les dictionnaires viennent de CC-CEDICT (CC BY-SA) et de KANJIDIC (CC BY-SA).
