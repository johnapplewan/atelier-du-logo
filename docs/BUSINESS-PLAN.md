# Atelier du Logo : coûts sur 5 ans et options de revenus

*Novembre 2026. C'est une estimation de travail, pas un conseil comptable ou juridique. Les montants sont hors taxes. Ce sont des ordres de grandeur à revoir chaque année : les prix des services en ligne et surtout de l'IA évoluent vite. Les taux sociaux et fiscaux sont à confirmer avec un expert-comptable.*

## 1. Hypothèses

**Le modèle de départ, qui fait la force du projet :**
- l'atelier tourne **dans le navigateur de l'utilisateur** : dessin, charte, animation, son et exports vidéo sont calculés sur son appareil ;
- les projets restent chez lui ;
- **le cœur gratuit ne coûte donc presque rien à servir**, que l'on ait 1 000 ou 100 000 utilisateurs.

**Ce qui coûte de l'argent à chaque utilisation :**
- **l'IA hébergée** : si l'atelier appelle lui-même un modèle, au lieu de passer par le claude.ai de l'utilisateur comme aujourd'hui ;
- **le stockage et la synchronisation en ligne** : comptes, sauvegarde cloud, partage, équipes ;
- **le support** et la **conformité** (RGPD, CGU, facturation, TVA).

**Trois scénarios d'utilisateurs actifs par mois (MAU)**, fin d'année :

| | A1 | A2 | A3 | A4 | A5 |
|---|---|---|---|---|---|
| Prudent | 800 | 3 000 | 7 000 | 12 000 | 18 000 |
| **Central** | 2 000 | 8 000 | 20 000 | 40 000 | 70 000 |
| Ambitieux | 5 000 | 25 000 | 60 000 | 120 000 | 200 000 |

**Hypothèses de conversion et de revenu :**
- **Conversion en payant** : 2 % (prudent), 3 % (central), 4 % (ambitieux) des MAU, à partir de l'ouverture de l'offre Pro en fin d'A1.
- **Revenu moyen par payant (ARPPU)** : 8 € par mois, en mélangeant les abonnements mensuels, annuels et les crédits IA.

## 2. Coût de l'IA hébergée (le poste le plus variable)

Tarifs Claude actuels (novembre 2026), par million de tokens en entrée / sortie : **Haiku 5.5** 0,10 $ / 0,50 $ ; **Sonnet 5.5** 2 $ / 10 $ ; **Opus 5.5** 4 $ / 20 $.

On compte une demande de retouche typique : le dessin en tracés SVG et les bulles, soit environ 25 000 tokens en entrée, et la réponse avec les nouveaux tracés, soit environ 5 000 tokens en sortie.

| Modèle | Coût par demande | 40 demandes par mois et par utilisateur IA |
|---|---|---|
| Haiku 5.5 | ≈ 0,005 $ | ≈ 0,20 $ |
| Sonnet 5.5 | ≈ 0,10 $ | ≈ 4 $ |
| Opus 5.5 | ≈ 0,20 $ | ≈ 8 $ |

Le cache des prompts (contexte réutilisé) réduit le coût d'entrée de 30 à 60 % selon les usages.

**Conséquence** : une IA hébergée « illimitée et gratuite » n'est pas tenable. Il faut :
- garder la connexion **« apportez votre propre Claude »**, gratuite pour vous, car l'utilisateur passe par son abonnement claude.ai ou Claude Desktop ;
- **facturer l'IA hébergée** en crédits, ou l'inclure dans Pro avec un quota ;
- envoyer les tâches simples (nommer, classer, suggérer des couleurs) vers un modèle léger comme Haiku.

## 3. Coûts par poste (scénario central)

| Poste | A1 | A2 | A3 | A4 | A5 | Notes |
|---|---|---|---|---|---|---|
| **Hébergement** Cloudflare (Workers payant, D1, R2, Turnstile gratuit) | 100 € | 300 € | 900 € | 2 000 € | 3 500 € | Pas de frais de sortie sur R2 ; la sauvegarde cloud n'arrive qu'avec Pro |
| Domaine, e-mail pro, e-mails transactionnels | 250 € | 400 € | 700 € | 1 000 € | 1 500 € | Brevo, Resend ou équivalent |
| Suivi des erreurs, statistiques respectueuses (Sentry, Plausible) | 0 € | 300 € | 600 € | 900 € | 1 200 € | Formules gratuites au début |
| **IA hébergée** (coût brut, refacturé) | 0 € | 3 000 € | 7 000 € | 15 000 € | 25 000 € | ≈ 25 % des payants utilisent l'IA à environ 4 € par mois ; couverte par les crédits et Pro |
| **Paiement** (Merchant of Record : Paddle, Lemon Squeezy… ≈ 5 % + 0,50 $) | 0 € | 1 300 € | 3 200 € | 6 500 € | 11 000 € | Gère la TVA européenne (OSS) et la facturation ; Stripe seul coûte moins cher, mais la TVA est alors à votre charge |
| **Développement** externe (refonte de l'interface, freelances ponctuels) | 8 000 € | 12 000 € | 18 000 € | 25 000 € | 30 000 € | Hors votre temps ; A1 = refonte du front |
| **Maintenance et mises à jour** (navigateurs, dépendances, appareils de test) | 1 000 € | 2 000 € | 3 000 € | 4 000 € | 5 000 € | Dont un audit de sécurité externe à partir d'A2 |
| **Juridique** (relecture des CGU, RGPD, dépôt de marque) | 2 500 € | 800 € | 800 € | 1 000 € | 1 000 € | Dépôt de marque INPI ≈ 190 € pour une classe, union européenne ≈ 850 € |
| Comptabilité, banque, assurance responsabilité civile pro | 1 500 € | 2 000 € | 2 500 € | 3 000 € | 3 500 € | |
| **Marketing** (contenus, vidéos tutoriels, tests de publicité, lancements) | 2 500 € | 8 000 € | 15 000 € | 25 000 € | 35 000 € | Surtout du contenu et de la communauté ; la publicité seulement si elle est rentable |
| Support (outils) et gestion | 0 € | 300 € | 600 € | 1 200 € | 2 400 € | Le temps de support est à prévoir à partir d'A3 |
| **Total décaissé (hors rémunération)** | **≈ 16 000 €** | **≈ 30 000 €** | **≈ 52 000 €** | **≈ 85 000 €** | **≈ 120 000 €** | |

À ajouter : **votre rémunération** et les **cotisations**.
- En micro-entreprise, les cotisations sont d'environ 22 à 25 % du chiffre d'affaires, selon l'activité ; le taux est à vérifier.
- Au-delà des plafonds de la micro-entreprise, ou pour lever des fonds, il faut passer en **SASU ou SAS**.
- Si l'activité décolle, prévoir à partir d'A3 un ou deux postes (développement, support et communauté) : 45 000 à 60 000 € chargés par poste et par an.

**Pour le scénario prudent**, comptez environ 60 % de ces montants. **Pour le scénario ambitieux**, environ 2,5 fois, surtout à cause de l'IA, du marketing et de l'équipe.

## 4. Options de revenus, cohérentes avec le marché actuel

Le marché est saturé de **générateurs de logos par IA** (Canva, Looka, Brandmark, design.com…). Les logos y sont livrés à bas prix, souvent en image figée. L'Atelier du Logo se distingue sur quatre points :
- **des courbes vraiment éditables**, avec charte, animation et son ;
- **l'IA comme collaboratrice**, pas comme distributeur ;
- **le local d'abord**, donc une confidentialité réelle ;
- **un français soigné**, et une marque d'auteur (John Apple).

Il faut faire payer **ce qui coûte** ou **ce qui fait gagner de l'argent aux pros**, pas la base.

| Option | Pour qui | Prix indicatif | Intérêt |
|---|---|---|---|
| **1. Pro (abonnement)** | indépendants, créateurs | 8 à 12 € par mois, ou 79 à 99 € par an | Sauvegarde et synchronisation cloud, crédits IA inclus, exports 4K et 60 i/s, modèles et kits de marque, historique en ligne |
| **2. Crédits IA** | tous | packs de 5 € et 15 € | Suit le vrai coût de l'IA, sans abonnement ; idéal pour un marché qui bouge |
| **3. Studio / équipe** | agences, studios | 15 à 25 € par utilisateur et par mois | Espaces partagés, validation client par lien, plusieurs marques, commentaires |
| **4. Packs à l'unité** | tous | 9 à 29 € | Chartes premium, recettes d'animation, banques de sons sous licence, polices partenaires |
| **5. Place de marché de modèles** | créateurs | commission de 20 à 30 % | Des designers vendent modèles et recettes ; contenu sans coût de production |
| **6. Marque blanche et licences** | imprimeurs, créateurs de sites, banques, CCI | 100 à 500 € par mois et par partenaire | L'atelier intégré chez eux (« créez votre logo »), aux couleurs du partenaire |
| **7. Affiliation au bon moment** | tous | commission | Après la charte : imprimer cartes et goodies, déposer sa marque (service accompagné), domaine et site |
| **8. Éducation** | écoles, formations | 2 à 5 € par élève et par an | Licences établissements, contenus pédagogiques |
| **9. Vos services** | entreprises | 300 à 1 500 € par mission ou par jour | Accompagnement, formation à la création graphique, à l'audiovisuel et à l'IA ; l'atelier est votre meilleure vitrine |
| **10. Dons et soutien** | communauté | libre | PayPal, Wero, « membre fondateur » ; faible mais précieux au début |

**À éviter** :
- la publicité dans l'atelier : elle contredit la promesse de confidentialité ;
- le filigrane obligatoire sur les logos : il tue la confiance. Une mention discrète « créé avec l'Atelier du Logo », facultative, sur les vidéos gratuites, reste envisageable si les utilisateurs l'acceptent (à demander dans le sondage).

## 5. Projection des revenus (scénario central)

| | A1 | A2 | A3 | A4 | A5 |
|---|---|---|---|---|---|
| Abonnements et crédits (3 % des MAU × 8 € × 12 ; A1 : 3 mois) | 1 500 € | 23 000 € | 58 000 € | 115 000 € | 200 000 € |
| Packs, place de marché, affiliation | 500 € | 4 000 € | 12 000 € | 25 000 € | 40 000 € |
| Studio et marque blanche | 0 € | 3 000 € | 15 000 € | 35 000 € | 60 000 € |
| Vos services (accompagnement, formation) | 10 000 € | 20 000 € | 30 000 € | 35 000 € | 40 000 € |
| **Total** | **≈ 12 000 €** | **≈ 50 000 €** | **≈ 115 000 €** | **≈ 210 000 €** | **≈ 340 000 €** |
| Décaissé (section 3, hors rémunération) | 16 000 € | 30 000 € | 52 000 € | 85 000 € | 120 000 € |

**Lecture :**
- **Dans le scénario central**, l'équilibre hors rémunération arrive au cours de l'A2. Une rémunération correcte du fondateur devient possible à partir de l'A3. Les services financent le démarrage.
- **Dans le scénario prudent**, les revenus de produit restent modestes (≈ 3 000 à 50 000 € par an) : le projet vit surtout comme vitrine et levier pour vos services.
- **Dans le scénario ambitieux**, il faut une équipe dès l'A2, et éventuellement un financement (BPI, prêt d'honneur, business angels).

## 6. Recommandations

1. **Garder le cœur gratuit et local.** Il ne coûte presque rien et c'est l'argument différenciant. Ne rien promettre « pour toujours » : prévenir avant tout changement.
2. **Faire payer ce qui a un coût réel**, c'est-à-dire l'IA hébergée, le cloud et les équipes, de préférence en crédits transparents.
3. **Lancer tôt une liste d'attente Pro** avec un avantage « membre fondateur » (par exemple −30 % à vie). Le sondage dans l'appli sert aussi à la remplir (voir `docs/SONDAGE.md`).
4. **Passer par un Merchant of Record** pour la TVA européenne et la facturation, tant que l'équipe est petite.
5. **Mettre en avant vos services** dans l'atelier et sur le site : c'est le revenu le plus rentable à court terme.
6. **Revoir ce tableau chaque trimestre** : prix de l'IA, concurrence et coûts d'hébergement changent vite.
