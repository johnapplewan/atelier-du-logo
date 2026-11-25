# Passer l'atelier sur Cloudflare (Worker)

**Pourquoi un Worker plutôt que Pages.**
- **Les fichiers statiques** : le Worker sert le site public et l'atelier (`site/`) tels quels.
- **Le SaaS ensuite** : c'est le même Worker qui recevra plus tard les fonctions serveur (comptes, synchronisation, paiement), avec D1 pour la base de données et R2 pour les fichiers.
- **La sécurité** : il pose de vrais en-têtes, grâce au fichier `site-src/_headers` (CSP, `frame-ancestors`, `nosniff`…).

**Ce qui est prêt dans le dépôt :**
- `wrangler.jsonc` : un Worker nommé `atelier-du-logo`, qui sert le dossier `site/` produit par `node build.js` :
  - le site public (accueil, fonctionnalités, tarifs, guide, compte, pages légales) à la racine ;
  - l'atelier sous `/atelier/` ;
  - une page 404.
- `site-src/_headers` : les en-têtes de sécurité, et un cache désactivé pour les service workers et `files.json`.
- `site-src/sw.js` : retire proprement l'ancien service worker installé à la racine, quand l'atelier y était encore.

## 0. Avant tout : exporter tes projets
Le navigateur range les projets par adresse. Une fois l'atelier sur une nouvelle adresse, les projets enregistrés à l'ancienne n'y apparaissent pas.
1. Sur l'ancienne adresse : **Projets › Tout enregistrer dans un fichier**.
2. Sur la nouvelle : **Projets › Ouvrir un fichier…**.

## 1. Créer le Worker relié au dépôt GitHub
Dans le tableau de bord Cloudflare : **Workers & Pages › Create › Import a repository**, puis choisis `johnapplewan/atelier-du-logo`.

| Réglage | Valeur |
|---|---|
| Project name | `atelier-du-logo` |
| Build command | `node build.js` |
| Deploy command | `npx wrangler deploy` |
| Root directory | `/` (racine) |

## 2. Le numéro Wero (secret de build)
Le Worker est entièrement statique : un secret « d'exécution » (**Settings › Variables and Secrets**) ne lui sert à rien, et Cloudflare le signale. Le numéro doit être lu **au moment du build**, par `node build.js`.
1. Va dans **Settings › Build › Variables and secrets** (la section *Build*, sous *Build configuration*, et non celle du haut).
2. Choisis **Add**, type **Secret**, nom `ATELIER_WERO`, valeur : ton numéro.
3. Si tu l'avais mis dans les variables d'exécution, supprime-le de là.
4. Relance un build (**Deployments › Retry** ou un nouveau push) : le secret n'est pris en compte qu'au build suivant.

Le numéro n'apparaît jamais dans le dépôt.

## 3. Premier déploiement
Lance le déploiement, ou pousse sur `main` : chaque push redéploie. Le site répond sur `https://atelier-du-logo.<ton-compte>.workers.dev`, et l'atelier sur `/atelier/`. Vérifie qu'ils s'ouvrent, puis teste « Animer », la Charte et l'export. Si tu changes d'adresse (sous-domaine), ajoute la variable de build `SITE_URL` (par exemple `https://atelier.ton-domaine.fr`) : elle sert aux liens du plan du site et des aperçus de partage.

## 4. Le sous-domaine
Ton domaine est chez Cloudflare, donc c'est automatique (DNS et certificat). Va dans **Settings › Domains & Routes › Add › Custom domain** et saisis par exemple `atelier.ton-domaine.fr`.

## 5. Ensuite (Claude s'en charge)
- **Les liens de téléchargement** : changer `MCPB_URL` et `SKILL_URL` dans `src/template.html`. Ce sont les liens de l'extension Claude Desktop et du skill.
- **L'ancienne adresse GitHub Pages** : soit la garder en secours, soit la remplacer par une page qui redirige vers la nouvelle adresse.
- **Le SaaS** :
  - ajouter un script serveur (`main`) dans `wrangler.jsonc` ;
  - ajouter une base **D1** (comptes, abonnements, liste des projets) et un espace **R2** (projets complets, sons, images, vidéos exportées).
  - Neon n'est utile que si tu as besoin de Postgres.
