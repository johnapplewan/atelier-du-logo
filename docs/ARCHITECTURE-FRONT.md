# Architecture front-end et contraintes de design

*Document de référence pour une future refonte de l'interface (atelier, Motion, site public). Il décrit ce qui existe, ce qui ne doit pas casser et le chemin conseillé. État : novembre 2026.*

## 1. Vue d'ensemble

| Partie | Source | Sortie | Servie par |
|---|---|---|---|
| **Atelier** (logo, charte, projets, Claude) | `src/template.html` (~5 150 lignes : HTML + CSS + JS) | `app/index.html` | artefact claude.ai, GitHub Pages, Worker `/atelier/`, extension Claude Desktop |
| **Motion** (animation, exports) | `src/motion.js` (~1 100 lignes) | inséré dans `app/index.html` à `/*__MOTION__*/` | idem |
| **Service worker** (hors ligne) | `src/sw.js` | `app/sw.js` + `app/files.json` | idem, sauf l'artefact |
| **Site public** (accueil, tarifs, compte, légal) | `site-src/` (gabarit, pages, CSS, images) | `site/` | Worker Cloudflare |
| **Ressources** | `app/glyphs/`, `app/fonts.js`, `app/vendor/`, `app/icons/` | copiées telles quelles | tous |

- `build.js` assemble l'appli, calcule l'exemple par défaut (glyphes Montserrat), génère `sw.js` / `files.json`, puis appelle `build-site.js`.
- **Il n'y a ni framework ni bundler.** C'est du JavaScript natif, dans un seul script de page. Les fonctions sont globales, et l'état est porté par des variables globales (`layers`, `pals`, `groups`, `sel`, `view`, `hist`, `motion`…).
- **Rendu** : le dessin est du SVG généré en chaînes (`layerSVG` → `applyFx`) et injecté dans `#art`, avec une surcouche d'édition dans `#overlay`. Motion réutilise `layerSVG` et anime des `<g>` par attributs.

### Organisation du script de l'atelier (sections `/* ---------- … */`)
1. **Socle** : état, géométrie, historique, rendu, vue, outils, panneaux, interaction pointeur, clavier.
2. **Couleurs** : palettes, zones, dégradés, groupes, rotation.
3. **Création** : formes, plume, crayon, polices (« Mes polices », menu F, texte, texte vivant, clavier international), import d'image et vectorisation, styles et effets.
4. **Génération** : pictogrammes (`ICONS`, `FINE`), propositions de logo, concepts premium (`PREMIUM_CATALOG`).
5. **Sorties** : charte (`bookPages`, `buildPdf`), export, motifs.
6. **Services** : projets (IndexedDB), règles et guides, raccourcis, À propos, persistance (db de l'artefact), appli autonome (PWA, fenêtres), échange avec Claude.
7. **Motion**, puis démarrage.

## 2. Modèle de données (contrat à préserver)

- **Calque** `{id, name, group:"mark"|"word", subs:[[{x,y,i,o}]], zone, fill?, grp?, font?, ch?, fx?:[{t,a,c?}], open?, sw?, opacity?, blend?, visible?, locked?, kind?, live?}`
  - les courbes sont des points avec des poignées `i` / `o` ;
  - l'identifiant `id` est stable.
- **Projet** `{id, name, collection, doc:{layers, notes, pals, groups, curPal, wordText, brand, hist, guides, motion}}`, rangé dans IndexedDB `atelier-logo` (magasin `projects`). Le cache local est `atelier-logo-v1` / `-palette`.
- **Fichier** `.atelier.json` (`format: "atelier-logo"`) : le moyen d'échanger des projets entre appareils.
- **Motion** : `doc.motion = {v:1, dur, loop, anims:[{id,p,k,ids,at,len,stg,ease,ord,o,bz?,keys?}]}`.
- **Validation** : tout ce qui entre est vérifié (`validLayers`, `validDoc`, `validHist`, `validMotion`…). Une refonte doit garder ces validateurs à la frontière.
- **Échange avec Claude** : `{note, calques:[{id,d,couleur,nom,groupe}], supprimer, reponses}`. Il passe par le canal de patch (`atelier/patch`), avec le bandeau d'annulation et une entrée « Claude : note » dans l'historique.

## 3. Contraintes techniques (ne pas casser)

1. **L'artefact claude.ai.**
   - L'appli doit tourner dans le cadre de l'artefact : pas d'accès caméra (on passe par `<input capture>`), stockage et téléchargements via `caps`.
   - La publication se fait en fichiers statiques (`publish_files`) ; les types servis sont limités (pas de `.mcpb`).
2. **Hors ligne.**
   - Tout fichier nécessaire est listé dans `files.json` et mis en cache par `sw.js`.
   - Pas de CDN tiers : les polices d'interface et les bibliothèques (JSZip, opentype.js, mp4-muxer, webm-muxer) sont incluses dans l'appli.
3. **CSP.**
   - `script-src 'self' 'unsafe-inline'`, `connect-src 'self'`, Google Fonts seulement pour le texte vivant.
   - Une refonte peut supprimer `'unsafe-inline'` (scripts en fichiers séparés) ; elle ne doit pas en ajouter d'autres.
4. **Un seul document pour l'atelier.** `app/index.html` doit pouvoir s'ouvrir seul (artefact, extension).
   - Les fichiers séparés sont acceptés s'ils sont listés dans `files.json` et chargés avec des chemins **relatifs**, puisque l'appli vit aussi bien à `/`, à `/atelier-du-logo/` (Pages) qu'à `/atelier/` (Worker).
5. **Panneaux détachables.**
   - Les panneaux sont déplacés dans des fenêtres de même origine (`PANELS`, `detachPanel`), et `document.querySelector` cherche aussi dans ces fenêtres.
   - Un framework qui garde le DOM en mémoire devra prévoir des « portails » vers ces fenêtres.
6. **Les identifiants DOM servent aux tests.** Une cinquantaine de tests Playwright (`npm test`, ~300 vérifications) s'appuient sur des `id`, `data-*` et `__atelier` / `__motion`.
   - On garde les identifiants, ou on migre les tests dans la même PR.
7. **Le rendu SVG est la vérité.**
   - Le canevas, les aperçus, les exports, la charte et Motion passent tous par `layerSVG` / `applyFx`. Il ne faut pas dupliquer le rendu dans des composants.
   - Les dégradés et masques ont des identifiants préfixés (`cv-`, `mo-`, `th-`…) qui ne doivent pas se percuter.
8. **Performance.**
   - Un logo d'exemple fait environ 50 calques, avec filtres, masques et 16 tranches empilées.
   - Pendant un glisser, on évite les re-rendus complets : la surcouche se met à jour seule, et Motion ne change que des attributs par image.
9. **Accessibilité.**
   - Dialogues natifs `<dialog>` ; tout est utilisable au clavier (raccourcis documentés par la touche ?).
   - `prefers-reduced-motion` est respecté, avec des libellés `aria-*` sur les boutons-icônes.
   - Cible WCAG 2.2 AA.
10. **Textes.**
    - L'interface est en français, le code et les commentaires en anglais.
    - Signature : « par John Apple · édition vectorielle ».

## 4. Système de design actuel

### Couleurs (variables CSS identiques dans l'atelier et sur le site)
| Rôle | Variable | Valeur |
|---|---|---|
| Encre, nuit | `--ink` / `--night` | `#1D1D1F` |
| Texte secondaire | `--muted` | `#6B6B70` |
| Fond de travail | `--cream` | `#F4F4F2` |
| Panneaux, papier | `--paper` | `#FBFBFA` |
| Blanc | `--ivory` / `--white` | `#FFFFFF` |
| Filets | `--line` | `#E3E3E0` |
| Accent interactif (sélection, focus, frise) | `--brass` / `--blue` | `#4F5BD5` |
| Accent de marque (logo, site) | `--accent` | `#E0703A` (texte accentué : `#B4501F`) |
| Danger | `--danger` | `#B42318` |

- **L'interface reste neutre** : elle ne prend jamais les couleurs du logo en cours d'édition. Les couleurs du logo n'apparaissent que dans le dessin et dans la palette.

### Typographie
- **Titres** : *Instrument Serif* (400), servie localement.
- **Texte et interface** : *Inter* (400 à 600), 13–14 px dans l'atelier, 17 px sur le site.
- **Petites capitales espacées** pour les intitulés de section : 12 px, `letter-spacing:.08–.14em`.
- **Chiffres** : `font-variant-numeric: tabular-nums` pour les durées et les valeurs.

### Formes et espacements
- **Rayons** : 6 à 10 px pour les contrôles, 12 à 16 px pour les cartes et dialogues, 22 px pour les grandes cartes du site, 999 px pour les boutons du site.
- **Ombres** : légères et doubles (`0 1px 2px` + `0 8–10px 30px`, opacité ≤ 8 %).
- **Grille** : multiples de 2 et de 4 ; panneaux latéraux de 260 à 340 px ; barre d'outils compacte.

### Mouvement
- **Interface** : transitions courtes (150 à 200 ms), sans rebond.
- **Le module Motion** a ses propres courbes (`MO_EASES`) : elles concernent le logo, pas l'interface.

### Points faibles à corriger
- **Le CSS est en ligne et éparpillé** : environ 430 règles dans `template.html` et plus de 80 dans `motion.js`.
- **Les rayons et les tailles ne sont pas normalisés** : on trouve 6, 7, 8, 9, 10 et 12 px.
- **Pas de tokens d'espacement.**
- **Les composants se répètent** : boutons, curseurs, cartes, onglets et puces sont réécrits par module.
- **La barre du haut est chargée** sur les écrans moyens (12 boutons).

## 5. Inventaire des composants

| Famille | Exemples | Où |
|---|---|---|
| Barre d'application | en-tête, menu ☰, statut, nom du projet | atelier, Motion |
| Panneaux | Outils, Grille, Calques, Sélection (inspecteur), Palette, Bulles | atelier (rétractables, détachables, feuilles sur mobile) |
| Barre d'onglets mobile | `#mbar` + feuilles | atelier ≤ 900 px |
| Dialogues | Export, Démarrage, Import d'image, Projets, Charte (questionnaire + visionneuse), Polices, À propos, Claude, Raccourcis, Confirmation, Export Motion | `<dialog>` natif |
| Contrôles | boutons, boutons-icônes, curseurs avec valeur, listes, couleurs, cases, segments | partout |
| Cartes | propositions de logo, projets, recettes, animations (`<details>`) | atelier, Motion |
| Spécifiques | règles et guides, frise (barres, clés, tête de lecture), éditeur de courbe de Bézier, bandeau d'annulation Claude, historique | atelier, Motion |

## 6. Recommandations pour la refonte

1. **D'abord les tokens.** Extraire couleurs, typographie, rayons (`--r-1: 6px`, `--r-2: 10px`, `--r-3: 16px`), espacements (`--s-1` à `--s-8`, base 4) et ombres dans un seul fichier CSS, partagé par l'atelier, Motion et le site. Le résultat est visible tout de suite, sans risque.
2. **Ensuite, des composants CSS sans framework.** Bouton, curseur à valeur, carte, onglets, dialogue, liste de calques, avec des classes documentées et une page d'exemples (`docs/ui.html`).
3. **Découper le script par modules, pas par framework.** Passer à des modules ES (`src/atelier/*.js`), avec un assemblage par `esbuild` qui sort toujours **un seul** `app/index.html`. On peut le faire module par module, à tests constants.
4. **Un framework ? Seulement si nécessaire.** Si un jour c'est le cas (par exemple pour le SaaS), préférer un outil léger qui sait produire un fichier unique et garder le SVG en chaînes : Preact, Svelte ou Solid. Le moteur de rendu, le modèle et les validateurs restent du JavaScript pur, partagé.
5. **Le site public peut évoluer à part.** Il est déjà indépendant (`site-src/`) et peut passer à un générateur de site statique (Astro, Eleventy) sans toucher l'atelier, à condition de garder les mêmes tokens.
6. **Garder les garde-fous** : tests Playwright à chaque étape, CSP, hors ligne, artefact, panneaux détachables et identifiants de test.

## 7. Contraintes de design (charte d'interface)

1. **L'œuvre d'abord** : le dessin occupe la place centrale. L'interface est neutre (crème, papier, encre) et s'efface. Aucun dégradé ni effet décoratif dans l'interface.
2. **Une seule action principale par écran** : bouton noir plein. Les actions secondaires sont des boutons clairs à filet ; les actions dangereuses passent toujours par une confirmation.
3. **La hiérarchie vient de la typographie**, pas de la couleur : titres en serif, intitulés en petites capitales espacées, valeurs en chiffres tabulaires.
4. **Le bleu `#4F5BD5` sert à l'interaction** (sélection, focus, clés de la frise). **L'orange `#E0703A` appartient à la marque** (logo, site) ; il ne sert pas pour l'état de l'interface.
5. **Des contrôles directs** : glisser sur le dessin, la frise ou la courbe. Chaque réglage a un curseur avec sa valeur lisible, et tout s'annule (Ctrl+Z, historique).
6. **Adapté à chaque écran** :
   - ordinateur : panneaux latéraux ;
   - tablette : tout l'atelier, cibles de 40 px ou plus ;
   - téléphone : un panneau à la fois en feuille, l'essentiel seulement (Motion : recettes, réglages simples, export ; pas de frise).
7. **Textes courts et concrets en français**, au vouvoiement sur le site et à l'impératif dans l'interface (« Exporter », « Choisissez… »), sans jargon. Ils disent ce qui va se passer.
8. **Confiance** : ne jamais perdre une courbe. Les retouches de Claude passent par le canal de patch, avec le bandeau d'annulation, et l'interface rappelle que les projets restent sur l'appareil.
9. **Accessibilité** : contraste AA, focus visible, tout au clavier, `prefers-reduced-motion` respecté, pas d'information portée par la seule couleur.
10. **Performance perçue** : retour immédiat sous les 100 ms pour les gestes, barre de progression et annulation pour tout ce qui dure plus d'une seconde (exports, PDF).
