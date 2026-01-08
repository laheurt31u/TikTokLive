---
stepsCompleted: [1, 2, 3, 4, 5]
inputDocuments:
  - docs/ARCHITECTURE.md
  - docs/PLAN.md
  - _bmad-output/planning-artifacts/archive/ARCHITECTURE.md
  - _bmad-output/planning-artifacts/archive/PLAN.md
  - _bmad-output/planning-artifacts/archive/CODE_STRUCTURE.md
date: 2026-01-07
author: Octozu
---

# Product Brief: TikTokLive

## Executive Summary

TikTokLive est un système automatisé de quiz interactif pour les lives TikTok qui permet aux créateurs de générer de l'engagement sans intervention manuelle. Le système affiche des questions de culture générale à l'écran, les viewers répondent dans le chat TikTok, et le premier à répondre correctement voit sa photo de profil affichée avec le message "Vous avez gagné". Le système fonctionne de manière autonome sur un serveur Windows, permettant aux créateurs de se concentrer sur leur contenu tout en maximisant l'interaction avec leur audience.

---

## Core Vision

### Problem Statement

Les créateurs TikTok Live cherchent constamment des moyens d'augmenter l'engagement et l'interaction avec leur audience pendant leurs lives. Actuellement, ils doivent lire manuellement les pseudos des viewers, leur parler directement, et gérer les interactions en temps réel tout en créant du contenu. Cette approche manuelle est chronophage, difficile à gérer simultanément, et limite leur capacité à générer de l'engagement de manière cohérente.

Pour les viewers, l'expérience actuelle des lives TikTok manque souvent d'interactivité directe et de reconnaissance. Ils veulent participer activement, être reconnus pour leurs contributions, et ressentir un sentiment de compétition et d'accomplissement.

### Problem Impact

Sans solution automatisée, les créateurs doivent :
- Diviser leur attention entre la création de contenu et la gestion manuelle des interactions
- Perdre du temps précieux à lire et répondre aux commentaires
- Limiter leur capacité à générer de l'engagement de manière cohérente
- Risquer de perdre des viewers qui cherchent une expérience plus interactive

Pour les viewers, l'absence d'interactivité structurée peut mener à :
- Un sentiment de passivité pendant le live
- Un manque de reconnaissance pour leur participation
- Une diminution de l'envie de revenir sur les lives

### Why Existing Solutions Fall Short

Les solutions actuelles pour générer de l'engagement sur TikTok Live sont limitées :
- **Réactions et dons** : Offrent une interaction mais manquent de structure et de gamification
- **Interactions manuelles** : Nécessitent la présence constante du créateur et sont chronophages
- **Outils externes** : Peuvent exister pour d'autres plateformes (Twitch, YouTube) mais ne sont pas adaptés à l'écosystème TikTok Live
- **Manque d'automatisation** : Aucune solution ne permet de générer de l'engagement de manière complètement automatisée sans intervention du créateur

### Proposed Solution

TikTokLive est un système automatisé qui transforme les lives TikTok en expériences interactives de quiz. Le système :

1. **Affiche automatiquement des questions** de culture générale à l'écran pendant le live
2. **Écoute le chat TikTok** en temps réel pour détecter les réponses des viewers
3. **Identifie le premier gagnant** et affiche sa photo de profil avec le message "Vous avez gagné"
4. **Fonctionne de manière autonome** sur un serveur Windows, sans nécessiter la présence du créateur
5. **Gamifie l'expérience** avec un système de points (selon la difficulté des questions), des leaderboards en temps réel, et un classement hebdomadaire

Le système complète les interactions existantes (réactions, dons) en ajoutant une couche structurée de gamification qui motive les viewers à participer activement et à revenir pour améliorer leur score.

### Key Differentiators

1. **Automatisation complète** : Le système fonctionne de manière autonome sur un serveur Windows, permettant aux créateurs de lancer un live et de laisser le système gérer les interactions sans intervention manuelle

2. **Intégration native TikTok Live** : Connexion directe au chat TikTok via TikTok-Live-Connector, permettant une détection en temps réel des réponses dans le chat

3. **Reconnaissance sociale immédiate** : Affichage de la photo de profil du gagnant avec message de victoire, créant un sentiment de fierté et de reconnaissance pour les viewers

4. **Gamification complète** : Système de points selon la difficulté, leaderboards en temps réel, et classements hebdomadaires qui créent une motivation à long terme pour revenir

5. **Génération automatique de questions** : Intégration avec n8n et IA pour générer quotidiennement des questions variées, garantissant du contenu frais sans effort

6. **Preuve de concept validée** : Inspiré par des créateurs qui ont réussi à générer beaucoup d'engagement avec des approches similaires, démontrant la demande du marché

---

## Target Users

### Primary Users

#### Persona 1: Le Créateur TikTok Live (Octozu)

**Profil et Contexte :**
- Nouveau créateur TikTok qui lance son compte avec TikTokLive comme outil principal
- Objectif : croissance rapide de la chaîne avec revenus passifs
- Vision : monétisation, développement d'une communauté engagée, et croissance de l'influence
- Fréquence cible : lives 24/24 si possible pour maximiser la croissance
- Contenu : culture générale, tous les thèmes

**Expérience du Problème :**
- Démarre sans audience existante, besoin d'un outil pour générer de l'engagement dès le début
- Ne peut pas être présent 24/24 pour gérer manuellement les interactions
- Besoin d'automatisation pour permettre des lives continus sans intervention constante
- Objectifs métriques clairs : augmenter l'engagement, les dons, les abonnés, et les vues sur le live

**Vision du Succès :**
- Système qui fonctionne de manière autonome sur un serveur Windows
- Génération automatique d'engagement sans présence constante
- Croissance rapide de la communauté grâce à l'interactivité
- Revenus passifs via les dons générés par l'engagement
- Recommandation TikTok améliorée grâce aux interactions élevées

**Motivations Clés :**
- Automatisation complète pour permettre des lives 24/24
- Outil de lancement pour démarrer la chaîne avec un avantage compétitif
- Focus sur la croissance rapide et la monétisation
- Développement d'une communauté engagée autour du contenu de culture générale

#### Persona 2: Les Viewers/Participants

**Profil et Contexte :**
- Profil varié : tous types d'utilisateurs TikTok (tranches d'âge, intérêts, comportements variés)
- Découvrent le live via la recommandation TikTok (algorithme favorise les lives avec interactions élevées)
- Arrivent sur le live à différents moments (début, milieu, fin)
- Motivations principales : compétition, accumulation de points, reconnaissance sociale

**Expérience du Problème :**
- Manque d'interactivité structurée dans les lives TikTok classiques
- Besoin de reconnaissance et de visibilité (voir leur nom/image de profil cité dans le live)
- Envie de participer activement plutôt que d'être passif
- Recherche d'expériences gamifiées et engageantes

**Vision du Succès :**
- Répondre à la question dès leur arrivée sur le live
- Gagner des points selon la difficulté des questions
- Voir leur nom et image de profil affichés à l'écran avec message "Vous avez gagné"
- Entendre leur nom cité via TTS (Text-to-Speech) dans le live
- Utiliser les points accumulés pour déclencher des événements sur le stream (visuels ou sonores)
- Voir leur position dans le leaderboard en temps réel
- Participer au classement hebdomadaire (top de la semaine)
- Recevoir des récompenses pour les likes sur le live (système anti-spam)

**Motivations Clés :**
- **Reconnaissance sociale** : voir leur photo de profil et nom affichés à l'écran
- **Compétition** : être le premier à répondre, monter dans le classement
- **Gamification** : accumulation de points, utilisation pour déclencher des événements
- **Engagement actif** : participer plutôt que regarder passivement
- **Retour sur investissement** : likes contre récompenses (sans abus)

### Secondary Users

N/A - Le système se concentre sur deux groupes d'utilisateurs principaux : les créateurs et les viewers. Il n'y a pas d'utilisateurs secondaires (admin, support, etc.) car le système est conçu pour être autonome et ne nécessite pas de gestion externe.

### User Journey

#### Journey du Créateur

1. **Découverte et Setup :**
   - Découvre le besoin d'un système automatisé pour lancer son compte TikTok
   - Configure TikTokLive sur un serveur Windows
   - Configure la connexion TikTok Live via TikTok-Live-Connector
   - Configure la génération automatique de questions (n8n + IA)

2. **Onboarding :**
   - Lance son premier live avec TikTokLive activé
   - Le système démarre automatiquement et affiche la première question
   - Observe l'engagement généré en temps réel

3. **Usage Quotidien :**
   - Lance un live TikTok (manuellement ou via automatisation)
   - Le système fonctionne de manière autonome, affichant les questions automatiquement
   - Les questions sont générées quotidiennement via n8n (00:00)
   - Le créateur peut se concentrer sur son contenu pendant que le système gère les interactions
   - Suit les métriques : engagement, dons, abonnés, vues

4. **Moment de Succès :**
   - Constate une augmentation significative de l'engagement
   - Reçoit plus de dons grâce à l'interactivité
   - Voit sa communauté grandir avec des viewers qui reviennent pour les quiz
   - Le live est recommandé par l'algorithme TikTok grâce aux interactions élevées

5. **Usage à Long Terme :**
   - Lives 24/24 possibles grâce à l'automatisation
   - Revenus passifs générés via les dons
   - Communauté engagée qui revient régulièrement
   - Croissance continue de l'influence et de la monétisation

#### Journey du Viewer

1. **Découverte :**
   - Découvre le live via la recommandation TikTok (algorithme favorise les lives avec interactions élevées)
   - Voit une question de culture générale affichée à l'écran
   - Entend le créateur ou le TTS lire la question

2. **Premier Contact :**
   - Répond à la question dans le chat TikTok dès son arrivée
   - Si première réponse correcte : voit sa photo de profil affichée avec "Vous avez gagné"
   - Entend son nom cité via TTS dans le live
   - Reçoit des points selon la difficulté de la question

3. **Engagement Initial :**
   - Continue à répondre aux questions suivantes
   - Accumule des points au fil des bonnes réponses
   - Voit sa position dans le leaderboard en temps réel
   - Découvre qu'il peut utiliser ses points pour déclencher des événements (visuels ou sonores)

4. **Moment de Succès :**
   - Gagne une question et voit sa photo de profil affichée
   - Entend son nom cité dans le live
   - Utilise ses points pour déclencher un événement sur le stream
   - Monte dans le classement hebdomadaire

5. **Engagement à Long Terme :**
   - Revient régulièrement pour participer aux quiz
   - Compète pour le top de la semaine
   - Utilise stratégiquement ses points pour déclencher des événements
   - Partage le live avec ses amis pour montrer ses victoires
   - Fait des likes pour recevoir des récompenses (sans spam grâce au système anti-abus)
   - Devient un membre actif de la communauté du créateur

---

## Success Metrics

### User Success Metrics

#### Pour les Viewers/Participants

**Engagement et Participation :**
- **Taux de participation** : Pourcentage de viewers qui répondent à au moins une question pendant le live
- **Réponses par question** : Nombre moyen de réponses reçues pour chaque question affichée
- **Taux de réponse correcte** : Pourcentage de réponses correctes parmi toutes les réponses
- **Temps de réponse moyen** : Temps moyen entre l'affichage de la question et la première réponse correcte

**Rétention et Engagement à Long Terme :**
- **Taux de retour** : Pourcentage de viewers qui reviennent sur plusieurs lives
- **Streak moyen** : Nombre moyen de jours consécutifs de participation (système de streak basé sur le leaderboard hebdomadaire)
- **Utilisation des points** : Pourcentage de viewers qui utilisent leurs points accumulés pour déclencher des événements (visuels ou sonores)
- **Fréquence de participation** : Nombre moyen de questions auxquelles un viewer répond par live

**Reconnaissance et Satisfaction :**
- **Taux de victoire** : Pourcentage de viewers qui gagnent au moins une question par live
- **Affichage de profil** : Nombre de fois qu'une photo de profil est affichée à l'écran par live
- **Citations TTS** : Nombre de fois qu'un nom est cité via TTS par live

#### Pour le Créateur

**Engagement Généré :**
- **Viewers constants** : Nombre moyen de viewers simultanés sur le live (objectif : 50 viewers constants)
- **Taux d'engagement global** : Pourcentage de viewers actifs (qui participent, likent, ou donnent) par rapport au total
- **Interactions par live** : Nombre total d'interactions (réponses, likes, dons) générées par live

**Automatisation et Efficacité :**
- **Taux d'automatisation** : Pourcentage de questions gérées automatiquement sans intervention du créateur
- **Temps de fonctionnement autonome** : Nombre d'heures de live gérées sans intervention
- **Disponibilité système** : Pourcentage de temps où le système fonctionne correctement (uptime)

### Business Objectives

#### Objectifs à Court Terme (3 mois)

**Croissance de la Communauté :**
- **10 000 abonnés** : Objectif principal de croissance de la communauté
- **Taux de croissance** : Croissance mensuelle des abonnés
- **Taux de conversion viewers → abonnés** : Pourcentage de viewers qui s'abonnent après avoir participé aux quiz

**Engagement et Rétention :**
- **50 viewers constants** : Nombre moyen de viewers simultanés sur les lives
- **Fréquence des lives** : Nombre de lives par semaine/mois
- **Durée moyenne des lives** : Temps moyen de chaque live

**Monétisation Initiale :**
- **20€ par mois minimum** : Revenus générés via les dons pour couvrir les coûts d'infrastructure et LLM
- **Taux de dons** : Pourcentage de viewers qui font des dons
- **Valeur moyenne des dons** : Montant moyen par don

#### Objectifs à Long Terme (12 mois)

**Croissance Majeure :**
- **100 000 abonnés** : Objectif de croissance à long terme
- **Croissance exponentielle** : Accélération de la croissance grâce à l'algorithme TikTok (recommandation améliorée)

**Monétisation et Rentabilité :**
- **Revenus passifs** : Génération de revenus via les dons sans intervention constante
- **ROI positif** : Revenus supérieurs aux coûts d'infrastructure et LLM
- **Scalabilité** : Capacité à gérer plusieurs lives simultanés ou des lives 24/24

**Influence et Positionnement :**
- **Positionnement de marque** : Établissement comme créateur de référence pour les quiz interactifs
- **Communauté engagée** : Développement d'une communauté active et fidèle
- **Croissance organique** : Augmentation de la recommandation TikTok grâce aux interactions élevées

### Key Performance Indicators (KPIs)

#### KPIs de Croissance

1. **Abonnés**
   - **Métrique** : Nombre total d'abonnés
   - **Cible 3 mois** : 10 000 abonnés
   - **Cible 12 mois** : 100 000 abonnés
   - **Mesure** : Suivi quotidien via API TikTok

2. **Viewers Constants**
   - **Métrique** : Nombre moyen de viewers simultanés
   - **Cible** : 50 viewers constants
   - **Mesure** : Moyenne calculée sur tous les lives

3. **Taux de Croissance Mensuel**
   - **Métrique** : Pourcentage d'augmentation des abonnés par mois
   - **Cible** : Croissance positive continue
   - **Mesure** : (Abonnés fin de mois - Abonnés début de mois) / Abonnés début de mois × 100

#### KPIs d'Engagement

4. **Taux de Participation**
   - **Métrique** : Pourcentage de viewers qui répondent à au moins une question
   - **Cible** : À définir avec les données initiales
   - **Mesure** : (Viewers qui répondent / Total viewers) × 100

5. **Réponses par Question**
   - **Métrique** : Nombre moyen de réponses reçues par question
   - **Cible** : À définir avec les données initiales
   - **Mesure** : Total réponses / Nombre de questions

6. **Streak Moyen**
   - **Métrique** : Nombre moyen de jours consécutifs de participation
   - **Cible** : Augmentation continue pour améliorer la rétention
   - **Mesure** : Calcul basé sur le leaderboard hebdomadaire

7. **Utilisation des Points**
   - **Métrique** : Pourcentage de viewers qui utilisent leurs points
   - **Cible** : Beaucoup d'utilisateurs utilisent leurs points (objectif qualitatif à quantifier)
   - **Mesure** : (Viewers qui utilisent points / Viewers avec points) × 100

#### KPIs de Monétisation

8. **Revenus Mensuels**
   - **Métrique** : Total des dons reçus par mois
   - **Cible minimum** : 20€ par mois (pour couvrir infras + LLM)
   - **Mesure** : Somme de tous les dons reçus

9. **Taux de Conversion Viewers → Dons**
   - **Métrique** : Pourcentage de viewers qui font des dons
   - **Cible** : À définir avec les données initiales
   - **Mesure** : (Viewers qui donnent / Total viewers) × 100

10. **Valeur Moyenne des Dons**
    - **Métrique** : Montant moyen par don
    - **Cible** : À définir avec les données initiales
    - **Mesure** : Total dons / Nombre de dons

#### KPIs Techniques

11. **Disponibilité Système (Uptime)**
    - **Métrique** : Pourcentage de temps où le système fonctionne correctement
    - **Cible** : > 99% (pour permettre les lives 24/24)
    - **Mesure** : (Temps de fonctionnement / Temps total) × 100

12. **Taux d'Automatisation**
    - **Métrique** : Pourcentage de questions gérées automatiquement
    - **Cible** : 100% (système complètement autonome)
    - **Mesure** : (Questions gérées automatiquement / Total questions) × 100

### Strategic Alignment

**Connexion Vision → Métriques :**
- Les métriques d'engagement (participation, réponses) valident que le système génère l'interactivité recherchée
- Les métriques de croissance (abonnés, viewers) confirment que l'automatisation permet la croissance rapide
- Les métriques de monétisation (dons) démontrent que l'engagement se traduit en revenus passifs
- Les métriques techniques (uptime, automatisation) garantissent que le système peut fonctionner 24/24

**Connexion Utilisateurs → Business :**
- Le succès des viewers (participation, rétention) génère le succès business (croissance, revenus)
- La satisfaction des viewers (reconnaissance, gamification) crée une communauté engagée qui génère des revenus
- L'automatisation permet au créateur de se concentrer sur la croissance plutôt que sur la gestion manuelle

---

## MVP Scope

### Core Features

#### 1. Connexion TikTok Live
- **Intégration TikTok-Live-Connector** : Connexion automatique au chat TikTok Live
- **Écoute des commentaires** : Détection en temps réel des réponses dans le chat
- **Gestion de la reconnexion** : Reconnexion automatique en cas de déconnexion

#### 2. Affichage des Questions
- **Affichage automatique** : Questions affichées à l'écran pendant le live
- **Questions manuelles** : Stockage des questions dans un fichier JSON (pas de génération automatique pour MVP)
- **Format questions** : Questions de culture générale avec réponses et difficulté
- **Rotation automatique** : Passage automatique à la question suivante après une réponse correcte ou expiration

#### 3. Détection et Validation des Réponses
- **Parsing des réponses** : Analyse des commentaires du chat pour détecter les réponses
- **Matching exact/partial** : Validation des réponses (exacte ou partielle selon la logique)
- **Identification du premier gagnant** : Détection du premier viewer à répondre correctement
- **Rate limiting** : Une seule réponse par viewer par question

#### 4. Affichage du Gagnant
- **Photo de profil** : Affichage de la photo de profil du gagnant à l'écran
- **Message de victoire** : Affichage du message "Vous avez gagné" avec le nom du gagnant
- **Interface OBS** : Page overlay optimisée pour OBS Browser Source

#### 5. Text-to-Speech (TTS)
- **Lecture des questions** : TTS lit automatiquement la question affichée
- **Annonce du gagnant** : TTS annonce le nom du gagnant quand il répond correctement
- **Intégration WebSocket** : Synchronisation TTS avec l'affichage visuel

#### 6. Système de Points
- **Attribution de points** : Points attribués selon la difficulté de la question
- **Stockage des scores** : Persistance des scores dans la base de données
- **Calcul en temps réel** : Mise à jour immédiate des scores après chaque bonne réponse

#### 7. Leaderboard en Temps Réel
- **Affichage du classement** : Top 10 (ou configurable) des meilleurs scores
- **Mise à jour en temps réel** : Mise à jour automatique via WebSocket
- **Classement hebdomadaire** : Reset hebdomadaire du classement (pas de streak pour MVP)

#### 8. Éléments Visuels et Audio
- **Sons audio** : Sons déclenchés en fonction des événements (dons, bonnes réponses, etc.)
- **Effets visuels** : Animations et effets visuels pour les événements importants
- **Synchronisation** : Coordination entre événements audio et visuels

#### 9. Infrastructure de Base
- **Backend Next.js** : API routes pour questions, scores, WebSocket
- **Base de données** : PostgreSQL/Supabase pour stocker questions et scores
- **Cache Redis** : Cache pour leaderboard (performance)
- **WebSocket (Socket.io)** : Communication temps réel entre backend et frontend

### Out of Scope for MVP

#### Fonctionnalités Différées

**Génération Automatique de Questions :**
- **Raison** : Complexité d'intégration n8n + IA, peut commencer avec questions manuelles
- **Alternative MVP** : Questions stockées dans JSON, ajout manuel
- **Version future** : Intégration n8n + IA pour génération quotidienne automatique

**Système de Streak :**
- **Raison** : Complexité supplémentaire, pas essentiel pour valider le concept
- **Alternative MVP** : Classement hebdomadaire simple (reset chaque semaine)
- **Version 2.0** : Système de streak basé sur la participation quotidienne

**Système de Likes contre Récompenses :**
- **Raison** : Complexité de gestion anti-spam, pas essentiel pour MVP
- **Alternative MVP** : Focus sur l'engagement via les quiz uniquement
- **Version future** : Système de récompenses pour likes avec protection anti-spam

**Alerte TTS Follow avec Affichage :**
- **Raison** : Nice to have, pas essentiel pour résoudre le problème principal
- **Alternative MVP** : Focus sur les quiz et gagnants
- **Version future** : Alerte TTS pour nouveaux followers avec affichage visuel

**Fonctionnalités Avancées :**
- Multi-lives simultanés
- Analytics avancés
- Modération automatique
- Export de données
- API publique

### MVP Success Criteria

#### Critères de Validation Technique

**Fonctionnement Autonome :**
- ✅ Système fonctionne sans intervention du créateur pendant au moins 1 heure de live
- ✅ Taux d'uptime > 95% pendant les tests
- ✅ Reconnexion automatique en cas de déconnexion TikTok

**Performance :**
- ✅ Détection des réponses en temps réel (< 2 secondes de latence)
- ✅ Affichage du gagnant en < 3 secondes après réponse correcte
- ✅ Leaderboard mis à jour en temps réel sans lag visible

#### Critères de Validation Utilisateur

**Engagement :**
- ✅ Au moins 10% des viewers répondent à au moins une question
- ✅ Au moins 5 réponses par question en moyenne
- ✅ Au moins 1 gagnant par live (validation que le système fonctionne)

**Expérience Utilisateur :**
- ✅ Les viewers comprennent comment participer sans explication
- ✅ Les gagnants voient leur photo de profil affichée correctement
- ✅ Le TTS fonctionne et améliore l'expérience

#### Critères de Validation Business

**Objectifs Initiaux :**
- ✅ Système permet de lancer le compte TikTok avec un avantage compétitif
- ✅ Génération d'engagement mesurable (réponses, participation)
- ✅ Validation que l'automatisation fonctionne pour permettre des lives 24/24

**Décision Go/No-Go :**
- **Go** : Si les critères techniques et utilisateur sont atteints, procéder à la version 2.0 avec streak et génération automatique
- **No-Go** : Si problèmes techniques majeurs ou aucun engagement, itérer sur le MVP

### Future Vision

#### Version 2.0 (Post-MVP)

**Système de Streak :**
- Suivi de la participation quotidienne
- Récompenses pour les streaks
- Classement basé sur les streaks en plus des points

**Génération Automatique de Questions :**
- Intégration n8n + IA (OpenAI GPT-4o)
- Génération quotidienne automatique (00:00)
- Validation et insertion automatique dans la base de données
- Diversité des thèmes et difficultés

**Améliorations d'Engagement :**
- Système de likes contre récompenses (avec anti-spam)
- Alerte TTS follow avec affichage
- Événements personnalisables déclenchés par points
- Thèmes et personnalisation avancés

#### Vision à Long Terme (12+ mois)

**Scalabilité :**
- Support multi-lives simultanés
- Support multi-créateurs (plateforme)
- API publique pour développeurs tiers

**Monétisation Avancée :**
- Système de premium/abonnement
- Marketplace de questions/thèmes
- Partenariats avec créateurs

**Analytics et Insights :**
- Dashboard analytics avancé
- Insights sur l'engagement
- Recommandations personnalisées

**Expansion :**
- Support autres plateformes (Twitch, YouTube Live)
- Application mobile dédiée
- Intégration réseaux sociaux
