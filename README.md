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
- **Règles et guides** (Ctrl+R) : glisser depuis une règle pose un guide, le ramener sur la règle le retire ; avec le magnétisme, les points s'y accrochent ; enregistrés avec le projet.
- **Raccourcis** (touche ? ou bouton ?) : tous les raccourcis en un endroit. Les textes d'aide ne restent plus affichés en permanence (option « Afficher les aides à l'écran »).
- **À propos** : présentation du projet, de l'auteur, et boutons de soutien (PayPal, Wero) dès que les liens sont renseignés dans `ABOUT`.
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

## Propositions de logo

« Proposition de logo » (au premier lancement ou dans « Marque et départ ») tire ses propositions du nom, du slogan, des mots-clés et des lettres clés. Elle les présente par séries de 9 : 5 premium et 4 illustrées. « Autres concepts » passe à la série suivante.

- **36 compositions premium**, construites selon [DESIGN-RULES.md](DESIGN-RULES.md) :
  - signature empilée ou en ligne, symbole seul ou dans un contenant (disque, cercle fin, carré arrondi, écusson, losange, hexagone, arche) ;
  - monogrammes découpés dans leur cadre ;
  - emblèmes à double filet ;
  - sceaux au nom écrit en cercle ;
  - six logotypes à détail ;
  - versions sombres sur plaque.
- **36 pictogrammes raffinés** pour les propositions premium. Ils sont dessinés au trait fin d'épaisseur constante, en vraies courbes de Bézier, avec un seul détail en couleur d'accent : cloche, couverts, toque, verre de vin, tasse, épi de blé, clé d'hôtel, lit, diamant, flacon, rouge à lèvres, étincelle, miroir, ciseaux, compas, équerre, colonne, maison, immeuble, casque, engrenage, code, écran, balance, graphique, appareil photo, feuille, livre, plume, vagues, montagne, cœur, soleil, lune, clé, couronne, fleur. Sur un contenant plein, le trait passe en clair.
- **62 pictogrammes pleins** (pour les styles des propositions illustrées), dont 36 métiers : bâtiment (casque, grue, truelle), immobilier (immeuble), industrie (engrenage, usine, clé à molette, éclair), beauté (flacon, rouge à lèvres, ciseaux, miroir), informatique (écran, code, puce, nuage), architecture (compas, équerre, colonne), food et restauration (toque, couverts, cloche, croissant, verre de vin), hôtellerie (lit, clé d'hôtel), et santé, droit, finance, joaillerie, photo, musique, sport, auto, formation, animaux, mode, peinture. Les mots-clés les appellent : « restaurant », « coiffure », « avocat », « développeur »…
- **Jusqu'à 26 propositions illustrées** quand un sujet est reconnu : chaque composition dans plusieurs styles (low poly, gravure, line art, pixel…), des sceaux, emblèmes et signatures illustrés, et la planche gravée pour le bois.
- **Sans sujet reconnu**, les compositions premium utilisent les initiales.
- **Si le sujet n'est pas dans la bibliothèque**, la proposition garde une place vide et une bulle demande à Claude de le dessiner.

## Tablette et téléphone

Sous 900 px de large (téléphone, tablette en portrait), le dessin occupe tout l'écran. Une barre d'onglets en bas (Outils, Calques, Sélection, Palette, Bulles) ouvre chaque panneau en volet, et un toucher sur le dessin le referme. Les actions secondaires passent dans le menu ☰. Le dessin se fait au doigt ou au stylet (pression), avec zoom à deux doigts. En paysage, une tablette garde les trois colonnes.

## Appli autonome

L'atelier fonctionne aussi hors de Claude, comme une application installable utilisable sans connexion :

- **En ligne sur GitHub Pages** : à chaque push sur `main`, `.github/workflows/pages.yml` publie `app/`. À activer une fois : Settings > Pages > Source : « GitHub Actions ».
- **En zip** : À propos > « Télécharger l'appli (zip) » récupère tous les fichiers (avec un `LISEZMOI.txt`). Pour l'ouvrir : `python3 -m http.server 8080` dans le dossier, puis http://localhost:8080.
- **Installer** : depuis la page servie en http(s), « Installer l'appli » (ou le menu du navigateur). Le service worker (`sw.js`, généré par `npm run build` avec `files.json`) met en cache tous les fichiers ; il ne s'active jamais dans l'artifact.
- **Fenêtres** (en-tête) : Outils, Calques, Sélection, Palette et Bulles se détachent chacun dans leur fenêtre, à placer sur un autre écran. Le panneau est déplacé, pas copié : un seul dessin, un seul historique, raccourcis clavier actifs dans chaque fenêtre. Fermer la fenêtre ou « Rattacher » le remet en place. Indisponible dans l'artifact (fenêtres bloquées).
- Hors artifact, les exports sont enregistrés directement par le navigateur ; les polices de l'interface et JSZip sont servis localement (`app/vendor/`).
- **Liens de soutien** (À propos) : le lien PayPal est dans le code ; le numéro Wero n'y est jamais. Dans l'artifact, il se lit dans le doc `atelier/about` de la base (`{"wero": "…"}`, écriture réservée au propriétaire). Sur GitHub Pages, il vient du secret `ATELIER_WERO` (Settings > Secrets and variables > Actions), lu par le workflow au moment du build. En local, il vient de `about.local.json` (ignoré par git) ou de la variable `ATELIER_WERO` au moment de `npm run build`. Il est encodé dans la page et ne s'affiche qu'au clic sur « Afficher le numéro ».

## Travailler avec Claude

Trois façons, dans « Connexions Claude » (sous les bulles) :

- **Dans l'artifact** : « Envoyer à Claude » transmet les bulles à la conversation, Claude modifie le dessin par le canal `atelier/patch`.
- **Copier-coller avec claude.ai** (gratuit) : « Copier la demande » copie le contexte (marque, calques en tracés SVG, bulles) et le format de réponse ; on colle la réponse de Claude avec « Coller la réponse ».
- **Clé API Anthropic** (appli autonome, payé à l'usage) : « Demander (clé API) » envoie les bulles et une image du logo à Claude Opus 5.5 via le SDK officiel (`app/vendor/anthropic-sdk.js`, sortie JSON structurée, `fallbacks: "default"`). La clé reste dans le navigateur.
- **Claude Desktop** : l'extension `app/downloads/atelier-du-logo.mcpb` sert l'atelier en local (hors ligne, http://127.0.0.1:4718) et donne à Claude les outils `atelier_ouvrir`, `atelier_etat`, `atelier_apercu`, `atelier_svg`, `atelier_appliquer`. La page lui répond par `/bridge/events` (SSE) et `/bridge/result`.

Le skill `skill/atelier-du-logo/SKILL.md` (zip : `app/downloads/atelier-du-logo-skill.zip`) apprend à Claude à travailler avec l'atelier dans chacun de ces modes. Guide utilisateur : [GUIDE.md](GUIDE.md).

Toutes les réponses passent par `applyClaudeReply` : bandeau « Annuler la modification de Claude », entrée « Claude : note » dans l'historique, calques verrouillés intouchés.

Reconstruire l'extension après une modification de l'appli : `npm run build` puis `npm run mcpb`. Le SDK Anthropic se met à jour avec `npm run sdk`.

## Arborescence

| Dossier | Contenu |
|---|---|
| `app/` | Ce qui est publié (artifact et GitHub Pages) : `index.html`, `sw.js` et `files.json` (générés), `manifest.webmanifest`, `icons/`, `fonts.js`, `glyphs/`, `dict-*.js` |
| `src/template.html` | Source de l'application |
| `build.js` | `npm run build` : `src/template.html` + le mot par défaut, dessiné depuis `app/glyphs/instrument.js` → `app/index.html` |
| `tools/fonts/` | Chaîne des polices (harfbuzzjs + opentype.js) : `gen.mjs` puis `trim.cjs` → `fonts.js` (métadonnées seules), `glyphs.cjs` → `app/glyphs/`, `dicts.cjs` → `app/dict-*.js` |
| `app/vendor/` | opentype.js et JSZip (MIT), polices de l'interface Instrument Serif et Inter (OFL) |
| `src/sw.js` | Source du service worker (hors ligne) |
| `tools/mcpb/` | Extension Claude Desktop : `server.js` (serveur MCP + pont vers la page), `build.mjs` → `app/downloads/atelier-du-logo.mcpb` |
| `tools/claude-sdk/` | Empaquetage du SDK Anthropic pour le navigateur → `app/vendor/anthropic-sdk.js` |
| `tests/` | Tests Playwright (Chromium) sur `app/` servi en local : `npm test` |

## Licences

Le code est sous licence MIT. Les polices sont libres (SIL OFL 1.1 ou Apache 2.0) et converties en contours. Les dictionnaires viennent de CC-CEDICT (CC BY-SA) et de KANJIDIC (CC BY-SA).
