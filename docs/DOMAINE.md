# Sous-domaine dédié pour l'atelier (Cloudflare + GitHub Pages)

**Pourquoi.** Sous `johnapplewan.github.io`, tous tes sites GitHub Pages partagent le même stockage dans le navigateur. Avec un sous-domaine (par exemple `atelier.ton-domaine.fr`), l'atelier a son propre espace, isolé, et une adresse plus professionnelle.

## 0. Avant tout : exporter tes projets
Le navigateur range les projets par adresse. Une fois le sous-domaine actif, l'ancienne adresse `johnapplewan.github.io/atelier-du-logo/` redirige vers la nouvelle, et les projets enregistrés à l'ancienne adresse n'y apparaissent plus.

1. Sur l'ancienne adresse : **Projets › Tout enregistrer dans un fichier** (un fichier `.atelier.json` avec tous les projets, collections et polices).
2. Après le passage au sous-domaine : **Projets › Ouvrir un fichier…** pour les réimporter.

## 1. Cloudflare : créer l'enregistrement DNS
Dans le tableau de bord Cloudflare, ouvre ton domaine, puis **DNS › Records › Add record** et remplis :

| Champ | Valeur |
|---|---|
| Type | `CNAME` |
| Name | le sous-domaine voulu, par exemple `atelier` |
| Target | `johnapplewan.github.io` |
| Proxy status | **DNS only** (nuage gris) pour commencer |

Enregistre. Le nuage gris est nécessaire au départ : GitHub doit voir le domaine directement pour créer le certificat HTTPS.

## 2. GitHub : déclarer le domaine
1. *(Recommandé, évite qu'un tiers ne s'approprie le sous-domaine)* Va dans **Settings du compte › Pages › Add a domain**. Ajoute ton domaine principal, puis crée dans Cloudflare l'enregistrement `TXT` indiqué par GitHub.
2. Dans le dépôt, va dans **Settings › Pages › Custom domain**, saisis `atelier.ton-domaine.fr`, puis **Save**.
3. Attends que la vérification DNS passe au vert, et que le certificat soit prêt (de quelques minutes à quelques heures).
4. Coche **Enforce HTTPS**.

La publication par GitHub Actions continue de fonctionner telle quelle. Avec ce mode de publication, il n'y a pas de fichier `CNAME` à ajouter.

## 3. Facultatif : activer Cloudflare devant le site
Une fois le HTTPS actif côté GitHub :
- **SSL/TLS › Overview** : choisis le mode **Full (strict)**.
- **DNS** : passe l'enregistrement en **Proxied** (nuage orange).
- **Rules › Transform Rules › Modify Response Header** : ajoute de vrais en-têtes de sécurité. Ils sont plus solides que la balise de la page, et `frame-ancestors` ne peut être posé que par un en-tête.
  - `Content-Security-Policy` : `default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' data: https://fonts.gstatic.com; img-src 'self' data: blob:; media-src 'self' data: blob:; connect-src 'self'; worker-src 'self'; manifest-src 'self'; frame-src 'none'; object-src 'none'; base-uri 'self'; form-action 'none'; frame-ancestors 'none'`
  - `X-Content-Type-Options` : `nosniff`
  - `Referrer-Policy` : `strict-origin-when-cross-origin`

## 4. Dans l'atelier
Quand le sous-domaine fonctionne, il faut changer deux adresses codées dans `src/template.html` : les liens de téléchargement de l'extension et du skill (`MCPB_URL`, `SKILL_URL`), puis reconstruire et republier. Claude peut s'en charger. En attendant, l'ancienne adresse redirige vers la nouvelle, donc rien ne casse.
