# Passer l'atelier sur Cloudflare (Worker)

**Pourquoi un Worker plutôt que Pages.**
- **Les fichiers statiques** : le Worker sert l'appli (`app/`) telle quelle.
- **Le SaaS ensuite** : c'est le même Worker qui recevra plus tard les fonctions serveur (comptes, synchronisation, paiement), avec D1 pour la base de données et R2 pour les fichiers.
- **La sécurité** : il pose de vrais en-têtes, grâce au fichier `app/_headers` (CSP, `frame-ancestors`, `nosniff`…).

**Ce qui est prêt dans le dépôt :**
- `wrangler.jsonc` : un Worker nommé `atelier-du-logo`, qui sert le dossier `app/`. Sa configuration a été vérifiée avec `wrangler deploy --dry-run`.
- `app/_headers` : les en-têtes de sécurité, et un cache désactivé pour `sw.js` et `files.json` afin que chaque nouvelle version arrive partout.

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

## 2. Le numéro Wero (secret)
Dans **Settings › Build › Variables and secrets**, ajoute une variable de type **Secret** nommée `ATELIER_WERO`, avec ton numéro. Elle n'est lue qu'au moment du build, comme sur GitHub, et n'apparaît jamais dans le dépôt.

## 3. Premier déploiement
Lance le déploiement, ou pousse sur `main` : chaque push redéploie. L'atelier répond alors sur `https://atelier-du-logo.<ton-compte>.workers.dev`. Vérifie qu'il s'ouvre, puis teste « Animer », la Charte et l'export.

## 4. Le sous-domaine
Ton domaine est chez Cloudflare, donc c'est automatique (DNS et certificat). Va dans **Settings › Domains & Routes › Add › Custom domain** et saisis par exemple `atelier.ton-domaine.fr`.

## 5. Ensuite (Claude s'en charge)
- **Les liens de téléchargement** : changer `MCPB_URL` et `SKILL_URL` dans `src/template.html`. Ce sont les liens de l'extension Claude Desktop et du skill.
- **L'ancienne adresse GitHub Pages** : soit la garder en secours, soit la remplacer par une page qui redirige vers la nouvelle adresse.
- **Le SaaS** :
  - ajouter un script serveur (`main`) dans `wrangler.jsonc` ;
  - ajouter une base **D1** (comptes, abonnements, liste des projets) et un espace **R2** (projets complets, sons, images, vidéos exportées).
  - Neon n'est utile que si tu as besoin de Postgres.
