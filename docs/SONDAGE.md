# Proposition : écouter les utilisateurs au bon moment

*Proposition à valider avant de la construire (lot C). Le stockage passera par le Worker Cloudflare, avec une base D1 et une protection Turnstile invisible.*

## Principe

Pas de long questionnaire qui interrompt le travail. Le recueil se fait en **petites cartes d'une question**, qui apparaissent seulement **à un moment de satisfaction ou de besoin** :
- on peut toujours les ignorer d'un clic ;
- **trois cartes au plus par mois**, jamais pendant qu'on dessine ;
- **anonymes par défaut** ;
- l'e-mail est demandé uniquement pour la liste d'attente, avec un consentement explicite.

Chaque carte se termine par un remerciement concret, comme « Merci, vous êtes membre fondateur ». C'est cette valeur rendue qui donne envie de répondre.

## Les cinq moments et ce qu'on demande

| # | Moment (déclencheur) | Forme | Ce qu'on apprend |
|---|---|---|---|
| 1 | **Juste après un premier export réussi** (logo, charte ou vidéo) : le pic de satisfaction | Carte en bas à droite : « Une note pour l'atelier ? » sur une échelle de 0 à 10, puis une question ouverte : « Qu'est-ce qui vous a le plus aidé ? » ou « Qu'est-ce qui a manqué ? » selon la note | Satisfaction (NPS), points forts, manques |
| 2 | **Dans Édition › Travailler avec Claude et dans Paramètres › Connexions** : au moment où l'on pense IA | Encadré « D'autres IA ? » : choix multiple, puis inscription facultative à la liste d'attente | Les IA qui intéressent ; liste d'attente |
| 3 | **Après 3 sessions ou 30 minutes d'usage cumulé** | « Mode remarque » : « Un bouton mal placé ? Cliquez dessus et dites-le-nous. » L'élément cliqué est noté (son identifiant, pas de capture d'écran), avec une phrase libre | Frictions d'interface, localisées précisément |
| 4 | **À l'ouverture de l'export vidéo ou de la charte** (les fonctions à forte valeur), une seule fois | 2 questions : « Combien paieriez-vous par mois pour … ? » (fourchettes) et « Pour que l'atelier reste gratuit, que seriez-vous prêt à faire ? » (choix multiple) | Disposition à payer, contreparties acceptables |
| 5 | **Page Tarifs du site et Plan › Nouveau projet (bandeau discret)** | « Rejoindre la liste Pro » : e-mail, usage (perso, freelance, agence, école) et fonctions voulues | Liste d'attente qualifiée, segments |

## Les questions

**Moment 2, connexions IA** : « Quelles IA aimeriez-vous connecter à l'atelier ? » Plusieurs réponses possibles :
- ChatGPT (OpenAI) ;
- Gemini (Google) ;
- Le Chat (Mistral, français) ;
- Copilot (Microsoft) ;
- Perplexity ;
- un modèle sur mon ordinateur (Ollama, LM Studio) ;
- une IA d'images (Midjourney, Firefly, Ideogram…) ;
- une IA de voix ou de musique (pour la bande son) ;
- aucune, Claude me suffit ;
- autre (champ libre).

Puis :
- « Comment les utiliseriez-vous ? » avec les choix *proposer des logos*, *retoucher*, *écrire la charte*, *créer des sons*, *traduire*, *autre* ;
- « Me prévenir quand c'est prêt », avec un e-mail facultatif et une case de consentement.

**Moment 4, contreparties** : « Pour que l'atelier reste gratuit, vous seriez d'accord pour… » Plusieurs réponses possibles :
- une mention discrète « créé avec l'Atelier du Logo » sur les vidéos gratuites ;
- partager certaines de mes créations dans une galerie publique ;
- donner mon avis de temps en temps ;
- parrainer d'autres personnes ;
- acheter un pack à l'unité de temps en temps ;
- faire un don libre ;
- partager des statistiques d'usage anonymes ;
- rien de tout ça, je préfère payer un abonnement ;
- autre.

Puis « Quel prix vous semblerait juste pour une offre Pro (cloud, IA incluse, exports 4K) ? », avec les choix *moins de 5 €*, *5 à 9 €*, *10 à 15 €*, *plus de 15 € par mois*, *je ne paierais pas*.

**Moment 1, satisfaction** :
1. « Recommanderiez-vous l'atelier à un ami ou un collègue ? », de 0 à 10.
2. Selon la note : « Qu'est-ce qui vous a le plus aidé ? » ou « Qu'est-ce qui vous a manqué ou gêné ? », en réponse libre.
3. Facultatif : « Vous êtes : particulier, indépendant, agence, école, autre. »

## La forme

- **La carte** :
  - même style que l'atelier (papier, encre, une seule action principale) ;
  - une question par écran, des points de progression, « Passer » toujours visible ;
  - accessible au clavier, fermée par Échap ;
  - sur téléphone, en feuille depuis le bas.
- **Le remerciement** :
  - « Merci ! Vous faites partie des membres fondateurs » ;
  - un badge dans Paramètres › À propos, et un avantage annoncé, par exemple −30 % à vie sur Pro pour les inscrits à la liste d'attente pendant la bêta.
- **La fréquence** : enregistrée sur l'appareil. Une même question n'est jamais reposée ; trois cartes au plus par mois.
- **La transparence** : un lien « Pourquoi cette question ? » mène à la page Confidentialité, qui explique ce qui est gardé, combien de temps (24 mois) et comment l'effacer.

## La technique (lot C)

- **API** : `POST /api/avis` sur le Worker.
- **Protection** : Turnstile invisible, une limite par adresse, une taille maximale par réponse.
- **Données conservées** : `{question, réponse, version de l'appli, langue, type d'appareil}`. Aucun dessin, aucune adresse IP conservée.
- **Liste d'attente** : `POST /api/liste`, avec un e-mail confirmé par double opt-in, une raison et le consentement daté.
- **Base D1** : tables `avis`, `liste_attente`, `remarques` (identifiant d'élément, texte).
- **Tableau de bord** : une page privée du Worker, protégée par Cloudflare Access : courbes NPS, top des IA demandées, top des boutons signalés, prix jugés justes.
- **À créer de votre côté** : une base D1 et un widget Turnstile dans le tableau de bord Cloudflare. Je fournis le code, le schéma et les étapes.
