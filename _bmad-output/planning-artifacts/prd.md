---
stepsCompleted: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]
inputDocuments:
  - _bmad-output/planning-artifacts/product-brief-TikTokLive-2026-01-07.md
workflowType: 'prd'
lastStep: 11
briefCount: 1
researchCount: 0
brainstormingCount: 0
projectDocsCount: 0
date: 2026-01-07
author: Octozu
---

# Product Requirements Document - TikTokLive

**Author:** Octozu
**Date:** 2026-01-07

## Executive Summary

TikTokLive est un système automatisé de quiz interactif pour les lives TikTok qui transforme l'expérience de streaming en direct en une expérience gamifiée et engageante. Le système permet aux créateurs de générer de l'engagement sans intervention manuelle en affichant automatiquement des questions de culture générale, en détectant les réponses dans le chat TikTok en temps réel, et en reconnaissant immédiatement les gagnants avec l'affichage de leur photo de profil. Le système fonctionne de manière autonome sur un serveur Windows, permettant aux créateurs de se concentrer sur leur contenu tout en maximisant l'interaction avec leur audience.

Cette solution répond au besoin critique des créateurs TikTok Live de générer de l'engagement de manière cohérente sans avoir à gérer manuellement les interactions, tout en offrant aux viewers une expérience interactive structurée avec reconnaissance sociale et gamification complète.

### What Makes This Special

TikTokLive se distingue par six différenciateurs clés qui créent une proposition de valeur unique :

1. **Automatisation complète** : Le système fonctionne de manière autonome sur un serveur Windows, permettant aux créateurs de lancer un live et de laisser le système gérer les interactions sans intervention manuelle. Cette automatisation permet des lives 24/24 et libère le créateur pour se concentrer sur la croissance de sa communauté.

2. **Intégration native TikTok Live** : Connexion directe au chat TikTok via la librairie `tiktok-live-connector` (npm), permettant une détection en temps réel des réponses dans le chat. Cette intégration native offre une latence minimale et une fiabilité maximale pour l'expérience interactive.

3. **Reconnaissance sociale immédiate** : Affichage de la photo de profil du gagnant avec message de victoire, créant un sentiment de fierté et de reconnaissance pour les viewers. Cette reconnaissance immédiate motive la participation active et crée un sentiment d'accomplissement.

4. **Gamification complète** : Système de points selon la difficulté, leaderboards en temps réel, et classements hebdomadaires qui créent une motivation à long terme pour revenir. Les viewers peuvent utiliser leurs points pour déclencher des événements visuels ou sonores, ajoutant une couche d'interactivité supplémentaire.

5. **Génération automatique de questions** : Intégration avec n8n et IA pour générer quotidiennement des questions variées, garantissant du contenu frais sans effort. Cette automatisation garantit que le contenu reste engageant et évite la répétition.

6. **Preuve de concept validée** : Inspiré par des créateurs qui ont réussi à générer beaucoup d'engagement avec des approches similaires, démontrant la demande du marché et validant l'approche avant même le développement.

## Project Classification

**Technical Type:** web_app  
**Domain:** general  
**Complexity:** low  
**Project Context:** Greenfield - new project

### Technical Classification Details

**Project Type: Web Application**
- **Architecture:** Next.js (App Router) avec backend API et frontend overlay
- **Real-time Communication:** WebSocket (Socket.io) pour communication temps réel
- **Integration:** Librairie `tiktok-live-connector` pour connexion native TikTok Live
- **Deployment:** Serveur Windows avec interface OBS Browser Source
- **Database:** PostgreSQL/Supabase pour persistance des données
- **Cache:** Redis pour performance du leaderboard

**Domain Classification: General**
- **Complexity Level:** Low - Pas de réglementation spécifique ou contraintes de conformité
- **Key Focus:** Engagement utilisateur, gamification, automatisation
- **Primary Concerns:** Performance temps réel, fiabilité de connexion, expérience utilisateur fluide

**Project Context: Greenfield**
- Nouveau projet sans codebase existant
- Liberté architecturale complète
- Focus sur MVP avec possibilité d'extension future
- Stack technologique moderne (Next.js, TypeScript, WebSocket)

Cette classification guide les décisions techniques et les priorités de développement, en mettant l'accent sur la performance temps réel, la fiabilité de l'intégration TikTok Live, et l'expérience utilisateur optimale pour les créateurs et les viewers.

---

## Success Criteria

### User Success

#### Pour les Viewers/Participants

**Engagement et Participation :**
- **Taux de participation** : Au moins 10% des viewers répondent à au moins une question pendant le live
- **Réponses par question** : Au moins 5 réponses par question en moyenne
- **Taux de réponse correcte** : Pourcentage de réponses correctes parmi toutes les réponses (à mesurer)
- **Temps de réponse moyen** : Temps moyen entre l'affichage de la question et la première réponse correcte (à optimiser)

**Rétention et Engagement à Long Terme :**
- **Taux de retour** : Pourcentage de viewers qui reviennent sur plusieurs lives (objectif : augmentation continue)
- **Streak moyen** : Nombre moyen de jours consécutifs de participation (pour version 2.0)
- **Utilisation des points** : Pourcentage de viewers qui utilisent leurs points accumulés pour déclencher des événements (visuels ou sonores)
- **Fréquence de participation** : Nombre moyen de questions auxquelles un viewer répond par live

**Reconnaissance et Satisfaction :**
- **Taux de victoire** : Au moins 1 gagnant par live (validation que le système fonctionne)
- **Affichage de profil** : Les gagnants voient leur photo de profil affichée correctement à l'écran
- **Citations TTS** : Les gagnants entendent leur nom cité via TTS dans le live
- **Compréhension intuitive** : Les viewers comprennent comment participer sans explication

**Moment de Succès Utilisateur :**
- Un viewer répond correctement et voit immédiatement sa photo de profil affichée avec le message "Vous avez gagné"
- Un viewer entend son nom cité via TTS, créant un sentiment de reconnaissance et de fierté
- Un viewer accumule des points et peut les utiliser pour déclencher des événements sur le stream
- Un viewer voit sa position dans le leaderboard et est motivé à revenir pour améliorer son score

#### Pour le Créateur

**Engagement Généré :**
- **Viewers constants** : 50 viewers constants (nombre moyen de viewers simultanés sur le live)
- **Taux d'engagement global** : Pourcentage de viewers actifs (qui participent, likent, ou donnent) par rapport au total
- **Interactions par live** : Nombre total d'interactions (réponses, likes, dons) générées par live

**Automatisation et Efficacité :**
- **Taux d'automatisation** : 100% des questions gérées automatiquement sans intervention du créateur
- **Temps de fonctionnement autonome** : Système fonctionne sans intervention pendant au moins 1 heure de live
- **Disponibilité système** : > 99% d'uptime pour permettre des lives 24/24

**Moment de Succès Créateur :**
- Le créateur lance un live et le système fonctionne de manière autonome, générant de l'engagement sans intervention
- Le créateur constate une augmentation significative de l'engagement, des dons, et des abonnés
- Le créateur peut se concentrer sur son contenu pendant que le système gère les interactions
- Le live est recommandé par l'algorithme TikTok grâce aux interactions élevées

### Business Success

#### Objectifs à Court Terme (3 mois)

**Croissance de la Communauté :**
- **10 000 abonnés** : Objectif principal de croissance de la communauté
- **Taux de croissance** : Croissance mensuelle positive continue des abonnés
- **Taux de conversion viewers → abonnés** : Pourcentage de viewers qui s'abonnent après avoir participé aux quiz

**Engagement et Rétention :**
- **50 viewers constants** : Nombre moyen de viewers simultanés sur les lives
- **Fréquence des lives** : Nombre de lives par semaine/mois (objectif : maximiser pour croissance)
- **Durée moyenne des lives** : Temps moyen de chaque live

**Monétisation Initiale :**
- **20€ par mois minimum** : Revenus générés via les dons pour couvrir les coûts d'infrastructure et LLM
- **Taux de dons** : Pourcentage de viewers qui font des dons
- **Valeur moyenne des dons** : Montant moyen par don

**Validation MVP :**
- Système permet de lancer le compte TikTok avec un avantage compétitif
- Génération d'engagement mesurable (réponses, participation)
- Validation que l'automatisation fonctionne pour permettre des lives 24/24

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

### Technical Success

#### Performance et Fiabilité

**Temps Réel :**
- **Détection des réponses** : < 2 secondes de latence entre la réponse dans le chat et la détection
- **Affichage du gagnant** : < 3 secondes après réponse correcte
- **Mise à jour leaderboard** : Mise à jour en temps réel sans lag visible

**Disponibilité :**
- **Uptime** : > 99% de disponibilité système (pour permettre les lives 24/24)
- **Reconnexion automatique** : Reconnexion automatique en cas de déconnexion TikTok
- **Taux d'uptime MVP** : > 95% pendant les tests initiaux

**Automatisation :**
- **Taux d'automatisation** : 100% des questions gérées automatiquement
- **Fonctionnement autonome** : Système fonctionne sans intervention pendant au moins 1 heure de live

**Intégration :**
- **Connexion TikTok Live** : Connexion stable via `tiktok-live-connector`
- **WebSocket** : Communication temps réel fiable entre backend et frontend
- **Base de données** : Persistance fiable des scores et questions

### Measurable Outcomes

#### KPIs de Croissance

1. **Abonnés**
   - Cible 3 mois : 10 000 abonnés
   - Cible 12 mois : 100 000 abonnés
   - Mesure : Suivi quotidien via API TikTok

2. **Viewers Constants**
   - Cible : 50 viewers constants
   - Mesure : Moyenne calculée sur tous les lives

3. **Taux de Croissance Mensuel**
   - Cible : Croissance positive continue
   - Mesure : (Abonnés fin de mois - Abonnés début de mois) / Abonnés début de mois × 100

#### KPIs d'Engagement

4. **Taux de Participation**
   - Cible MVP : Au moins 10% des viewers répondent à au moins une question
   - Mesure : (Viewers qui répondent / Total viewers) × 100

5. **Réponses par Question**
   - Cible MVP : Au moins 5 réponses par question en moyenne
   - Mesure : Total réponses / Nombre de questions

6. **Utilisation des Points**
   - Cible : Beaucoup d'utilisateurs utilisent leurs points (objectif qualitatif à quantifier)
   - Mesure : (Viewers qui utilisent points / Viewers avec points) × 100

#### KPIs de Monétisation

7. **Revenus Mensuels**
   - Cible minimum : 20€ par mois (pour couvrir infras + LLM)
   - Mesure : Somme de tous les dons reçus

8. **Taux de Conversion Viewers → Dons**
   - Cible : À définir avec les données initiales
   - Mesure : (Viewers qui donnent / Total viewers) × 100

#### KPIs Techniques

9. **Disponibilité Système (Uptime)**
   - Cible : > 99% (pour permettre les lives 24/24)
   - Mesure : (Temps de fonctionnement / Temps total) × 100

10. **Latence de Détection**
    - Cible : < 2 secondes
    - Mesure : Temps entre réponse dans chat et détection système

## Product Scope

### MVP - Minimum Viable Product

Le MVP se concentre sur les fonctionnalités essentielles pour valider le concept et générer de l'engagement de base :

#### Fonctionnalités Core MVP

1. **Connexion TikTok Live**
   - Intégration `tiktok-live-connector` pour connexion au chat
   - Écoute des commentaires en temps réel
   - Gestion de la reconnexion automatique

2. **Affichage des Questions**
   - Affichage automatique des questions à l'écran
   - Questions stockées dans un fichier JSON (ajout manuel)
   - Rotation automatique après réponse correcte ou expiration

3. **Détection et Validation des Réponses**
   - Parsing des commentaires pour détecter les réponses
   - Matching exact/partial des réponses
   - Identification du premier gagnant
   - Rate limiting (1 réponse par viewer par question)

4. **Affichage du Gagnant**
   - Photo de profil du gagnant affichée à l'écran
   - Message "Vous avez gagné" avec nom du gagnant
   - Interface OBS optimisée

5. **Text-to-Speech (TTS)**
   - Lecture automatique des questions
   - Annonce du nom du gagnant
   - Synchronisation avec affichage visuel

6. **Système de Points**
   - Attribution de points selon difficulté
   - Stockage des scores en base de données
   - Calcul en temps réel

7. **Leaderboard en Temps Réel**
   - Top 10 (ou configurable) des meilleurs scores
   - Mise à jour en temps réel via WebSocket
   - Reset hebdomadaire (pas de streak pour MVP)

8. **Éléments Visuels et Audio**
   - Sons audio déclenchés par événements (dons, bonnes réponses)
   - Effets visuels pour événements importants
   - Synchronisation audio/visuel

9. **Infrastructure de Base**
   - Backend Next.js avec API routes
   - PostgreSQL/Supabase pour persistance
   - Redis pour cache leaderboard
   - WebSocket (Socket.io) pour temps réel

#### Critères de Validation MVP

**Technique :**
- Système fonctionne sans intervention pendant au moins 1 heure
- Uptime > 95% pendant les tests
- Reconnexion automatique fonctionnelle
- Latence < 2 secondes pour détection
- Affichage gagnant < 3 secondes

**Utilisateur :**
- Au moins 10% des viewers participent
- Au moins 5 réponses par question
- Au moins 1 gagnant par live
- Compréhension intuitive de la participation
- TTS fonctionne correctement

**Business :**
- Système permet de lancer le compte avec avantage compétitif
- Engagement mesurable généré
- Validation de l'automatisation pour lives 24/24

**Décision Go/No-Go :**
- **Go** : Si critères techniques et utilisateur atteints → Version 2.0
- **No-Go** : Si problèmes majeurs ou aucun engagement → Itérer sur MVP

### Growth Features (Post-MVP)

Fonctionnalités pour augmenter l'engagement et la rétention après validation du MVP :

#### Version 2.0

**Système de Streak :**
- Suivi de la participation quotidienne
- Récompenses pour les streaks
- Classement basé sur les streaks en plus des points

**Génération Automatique de Questions :**
- Intégration n8n + IA (OpenAI GPT-4o)
- Génération quotidienne automatique (00:00)
- Validation et insertion automatique
- Diversité des thèmes et difficultés

**Améliorations d'Engagement :**
- Système de likes contre récompenses (avec anti-spam)
- Alerte TTS follow avec affichage
- Événements personnalisables déclenchés par points
- Thèmes et personnalisation avancés

### Vision (Future)

Fonctionnalités pour la vision à long terme (12+ mois) :

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
