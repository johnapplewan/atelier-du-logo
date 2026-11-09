# Règles de design des propositions « premium »

Ces règles guident le générateur de propositions de l'atelier (`premiumPlans` / `buildPremium` dans `src/template.html`). Claude les applique aussi quand il dessine (voir le skill). Elles réunissent trois sources :
- l'observation des modèles de design.com : la page des modèles de logos, regardée à l'écran le 9 novembre 2026 ;
- les principes du skill *logo-design* ;
- les règles de typographie et de retenue des skills *apple-design*, *impeccable* et *canvas-design*.

## Ce qu'on observe sur design.com

- **La composition empilée centrée domine** : le symbole en haut, le NOM en capitales espacées en dessous, puis une ligne de signature (« DEPUIS 2026 », slogan) plus petite et encore plus espacée.
- **La couleur est une variante, pas un nouveau dessin.** Le même modèle existe en 9 palettes ; la structure ne bouge pas.
- **Une ou deux couleurs, rarement trois.** Le nom est dans une couleur d'encre, le symbole ou un détail dans l'accent. Les versions « premium » posent de l'or ou du crème sur un fond profond (marine, noir, vert forêt, aubergine).
- **Deux familles de lettres** : une capitale fine à empattements, de type Cinzel ou Trajan, pour le luxe et la tradition ; une grotesque géométrique large et grasse pour la tech, le sport et l'industrie. La signature est souvent plus légère que le nom.
- **Les symboles sont simples** : traits d'épaisseur constante (line art), aplats bicolores, monogramme dans un cadre (carré, cercle, écusson), emblème circulaire à double filet.
- **Ce qui fait « générique »** : dégradés et effets 3D, illustrations trop détaillées, symbole qui raconte le métier au lieu de l'évoquer.

## Les règles

### 1. Une idée, une composition
1. Chaque proposition repose sur **une seule idée**, dicible en une phrase.
2. Il y a cinq compositions :
   - **empilée centrée** ;
   - **horizontale** (symbole à gauche) ;
   - **monogramme encadré** ;
   - **emblème** ;
   - **logotype à détail**, c'est-à-dire le nom seul avec un élément propre à la marque.
3. Chaque série de propositions mélange au moins trois compositions différentes.

### 2. Proportions (unités du dessin, symbole dans un carré de 256)
- **Empilée** :
  - hauteur du symbole ≈ 3,5 × la hauteur de capitale du nom ;
  - espace entre symbole et nom ≈ 0,9 × la hauteur de capitale ;
  - largeur du nom entre 1,4 et 2,6 × la largeur du symbole.
- **Horizontale** :
  - hauteur du symbole ≈ 2 × la hauteur du bloc nom + signature ;
  - espace ≈ 0,5 × la hauteur du symbole ;
  - le nom est centré optiquement sur le symbole.
- **Signature** : hauteur de capitale ≈ 0,32 × celle du nom ; elle se place sous le nom, à 0,6 × la hauteur de capitale du nom.
- **Cadres et emblèmes** : marge intérieure ≥ 12 % du diamètre ; filet fin ≈ 1/64 du diamètre, filet fort ≈ 1/24.

### 3. Typographie
- **Deux familles au plus** : une pour le nom, une pour la signature. Souvent la même famille dans deux graisses.
- **Le nom en capitales** dans les compositions premium, avec un espacement qui dépend de la taille :
  - **+14 à +18 %** de l'em pour les capitales fines à empattements ;
  - **+6 à +10 %** pour les grotesques grasses.
- **La signature** prend un espacement plus large (**+30 à +40 %**) et une graisse plus légère. Plus un texte est petit, plus on l'espace (skill apple-design).
- **Jamais de script ni de manuscrite en capitales espacées.** Le logotype à détail peut garder les minuscules.
- **Accorder la police à l'humeur** :
  - luxe et tradition : capitales à empattements ;
  - nature et artisanat : sérif douce ;
  - tech : grotesque géométrique ;
  - industrie et solidité : grotesque condensée ou grasse ;
  - minimal : grotesque fine.

### 4. Couleur
- **Deux couleurs** : une **encre** (nom et cadre) et un **accent** (symbole ou un seul détail). Une troisième seulement pour le fond d'une version sombre.
- **Les accents « premium »** sont désaturés et profonds : or `#C2A15F`, terre cuite, vert sauge, bleu nuit. Jamais un rouge ou un bleu primaire saturé.
- **Version sombre** : une plaque profonde (fond), avec le nom en crème et le symbole en or. Elle est proposée en plus de la version claire, pas à sa place.
- Toute proposition doit **fonctionner en une couleur** : l'idée ne repose jamais sur la couleur seule.

### 5. Symbole
- **Évoquer, ne pas illustrer.** Un sujet de la bibliothèque est simplifié en aplat d'une seule couleur, sans effet.
- **Espace négatif** pour les monogrammes : les lettres sont découpées dans le cadre (de vrais trous), pas posées dessus.
- **Contenants simples** : cercle, carré arrondi (rayon ≈ 22 % du côté), écusson. Filets fins et réguliers.
- **Pas de détail plus petit que 1/48 du symbole.** Le symbole seul doit se lire à 16 px.

### 6. Finition
- **Centrage optique** : le symbole est placé 1 à 2 % au-dessus du centre géométrique. Les formes rondes dépassent légèrement.
- **Espacement optique** : les lettres larges et les lettres rondes s'équilibrent, au lieu d'un espacement fixe et mécanique.
- **Ni ombre, ni dégradé, ni biseau** pour rattraper une forme faible. Les styles (low poly, gravure…) restent des variantes que l'on applique ensuite, pas la base.
- **Présenter chaque proposition sur une tuile** de la couleur de son fond, avec beaucoup d'air autour (au moins 25 % de marge).

### 7. À éviter
- le clip-art littéral : une maison pour l'immobilier, une dent pour un dentiste ;
- plus de trois couleurs, des dégradés, des effets 3D ;
- des initiales dans une police par défaut, sans aucun détail ;
- un texte en arc illisible en petit ;
- un nom plus large que 3 fois le symbole en composition empilée.
