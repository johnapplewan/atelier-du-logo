# Veille design hebdomadaire

Une tâche planifiée lance chaque semaine une session Claude sur ce dépôt. La session suit ce document, dans l'ordre.

## 1. Veille (30 min au plus)
- Chercher sur le web les tendances récentes de logo et d'identité visuelle : articles de la semaine, palmarès, nouvelles identités de marques connues, fonderies typographiques.
- Ouvrir https://www.design.com/fr-fr/createur/logos avec Playwright (Chromium déjà installé) et regarder les modèles à l'écran, pas seulement le texte de la page.
- Écrire `docs/veille/AAAA-MM-JJ.md` :
  - les sources (liens) ;
  - 3 à 6 observations concrètes : compositions, typographies, couleurs, formes ;
  - ce qu'on en retient pour l'atelier.
- Ne modifier `DESIGN-RULES.md` que si une règle durable apparaît (pas une mode d'une semaine). Dire pourquoi dans la note.

## 2. Cinq nouvelles propositions
- **Trois premium** :
  - de nouvelles entrées dans `PREMIUM_CATALOG` (`src/template.html`) ;
  - au besoin, une nouvelle variante dans `buildPremium` : un contenant, un détail de logotype, une composition…
- **Deux illustrées** :
  - de nouveaux pictogrammes métier dans `ICONS`, avec leurs mots-clés dans `SUBJECTS` ;
  - ou une nouvelle composition illustrée dans `conceptPlan`.
  - Varier les métiers d'une semaine à l'autre, pas de cerf.
- Respecter `DESIGN-RULES.md` :
  - deux couleurs ;
  - capitales espacées ;
  - symbole simple, lisible à 16 px ;
  - aucun effet pour rattraper une forme faible.
- Ne pas dupliquer une proposition existante.
- Ne jamais casser les courbes de l'utilisateur ni le format des projets.

## 3. Vérifier
- Rendre une planche PNG des cinq propositions pour trois marques d'exemple de métiers différents. Enregistrer la planche dans `docs/veille/AAAA-MM-JJ.png`.
- La regarder, la comparer aux règles, corriger, rendre à nouveau.
- Lancer `npm run build`, puis `npm run mcpb`, puis `npm test`. Les tests doivent tous passer : ajuster `tests/start.js` si un compte de propositions change.

## 4. Livrer
- Créer la branche `claude/veille-AAAA-MM-JJ` depuis `main`. Commit et push.
- Ouvrir une PR en brouillon, en français : la veille en 5 lignes, les 5 propositions, et la planche en image.
- Ne pas fusionner, ne pas publier l'artifact : John Apple relit et fusionne. La fusion met le site GitHub Pages à jour.
- Finir par un résumé court en français : lien de la PR et ce qui a été ajouté.
