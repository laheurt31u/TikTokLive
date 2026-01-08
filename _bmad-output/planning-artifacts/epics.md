---
stepsCompleted: [1, 2, 3, 4]
inputDocuments:
  - _bmad-output/planning-artifacts/prd.md
  - _bmad-output/planning-artifacts/architecture.md
  - _bmad-output/planning-artifacts/ux-design-specification.md
---

# TikTokLive - Epic Breakdown

## Overview

This document provides the complete epic and story breakdown for TikTokLive, decomposing the requirements from the PRD, UX Design if it exists, and Architecture requirements into implementable stories.

## Requirements Inventory

### Functional Requirements

FR1: Connexion automatique au chat TikTok Live via `tiktok-live-connector`
FR2: Écoute en temps réel des commentaires TikTok
FR3: Gestion de la reconnexion automatique en cas de déconnexion
FR4: Affichage automatique des questions à l'écran via overlay OBS
FR5: Stockage des questions dans un fichier JSON (MVP)
FR6: Rotation automatique des questions après réponse correcte ou expiration
FR7: Parsing automatique des commentaires pour détecter les réponses
FR8: Validation des réponses (matching exact ou partiel)
FR9: Identification du premier gagnant pour chaque question
FR10: Rate limiting (une réponse par viewer par question)
FR11: Affichage de la photo de profil du gagnant à l'écran
FR12: Message "Vous avez gagné" avec le nom du gagnant
FR13: Text-to-Speech automatique pour annoncer le gagnant
FR14: Attribution automatique de points selon la difficulté de la question
FR15: Stockage persistant des scores en base de données
FR16: Leaderboard temps réel affichant le Top 10
FR17: Reset hebdomadaire du leaderboard
FR18: Sons audio déclenchés automatiquement par les événements (victoires, dons)
FR19: Effets visuels synchronisés avec les événements importants
FR20: Synchronisation audio/visuelle parfaite
FR21: Backend Next.js avec API routes REST
FR22: Base de données PostgreSQL/Supabase pour persistance
FR23: Cache Redis pour performance du leaderboard
FR24: Communication WebSocket temps réel bidirectionnelle
FR25: Génération automatique de questions via n8n + IA (version 2.0)
FR26: Validation et insertion automatique des questions générées (version 2.0)
FR27: Système de streak pour participation quotidienne (version 2.0)
FR28: Récompenses spéciales pour les streaks (version 2.0)
FR29: Classement basé sur les streaks en plus des points (version 2.0)
FR30: Système de likes contre récompenses avec anti-spam (version 2.0)
FR31: Alerte TTS automatique pour les nouveaux followers (version 2.0)
FR32: Événements personnalisables déclenchés par accumulation de points (version 2.0)
FR33: Thèmes et personnalisation avancée de l'interface (version 2.0)
FR34: Support multi-lives simultanés (version 3.0)
FR35: API publique pour intégration par développeurs tiers (version 3.0)
FR36: Application mobile dédiée pour TikTokLive (version 3.0)
FR37: Dashboard analytics avancé pour les créateurs (version 3.0)

### NonFunctional Requirements

NFR1: Latence < 2 secondes entre réponse dans chat TikTok et détection système
NFR2: Affichage du gagnant < 3 secondes après réponse correcte
NFR3: Mise à jour du leaderboard en temps réel sans lag perceptible
NFR4: Disponibilité système > 99% pour permettre les lives 24/24
NFR5: Reconnexion automatique en cas de déconnexion TikTok Live
NFR6: Gestion gracieuse des erreurs avec fallback modes
NFR7: Support de centaines de réponses simultanées sans dégradation
NFR8: Architecture modulaire prête pour extension future (IA, multi-lives)
NFR9: Interface overlay optimisée pour OBS Browser Source
NFR10: Animations GPU-accelerated pour performance streaming
NFR11: Feedback visuel instantané (< 2 secondes) pour toutes les interactions
NFR12: Design inclusif malgré contraintes overlay limité
NFR13: Contrast des couleurs WCAG AA minimum pour accessibilité
NFR14: Design responsive pour différentes résolutions d'écran
NFR15: Bundle JavaScript < 200KB gzippé pour chargement rapide
NFR16: Utilisation mémoire optimisée pour stabilité streaming
NFR17: Network efficiency avec lazy loading des assets lourds
NFR18: Sécurité avec validation stricte des inputs TikTok
NFR19: Rate limiting et protection contre spam/abuse
NFR20: Chiffrement des données sensibles utilisateur
NFR21: Monitoring temps réel avec métriques performance
NFR22: Logging structuré avec correlation IDs pour debugging

### Additional Requirements

#### From Architecture Document:
- **Template Starter Next.js + TypeScript + Socket.io** : Utiliser le template Next.js recommandé avec Socket.io pour foundation technique
- **Architecture Event-Driven** : Tous les composants communiquent via WebSocket events avec patterns standardisés
- **Base de données hybride** : PostgreSQL pour données ACID critiques + Redis pour cache temps réel
- **Circuit Breaker Pattern** : Abstraction layer pour l'intégration TikTok avec gestion des pannes
- **Optimisations Performance** : Connection pooling DB, message batching WebSocket, compression
- **Sécurité Defense in Depth** : Multi-layer security avec validation Zod, rate limiting, encryption
- **Monitoring Stack** : OpenTelemetry avec métriques SLOs (latence, throughput, erreurs)
- **Pipeline CI/CD** : GitHub Actions avec tests automatisés, security scanning, déploiement automatisé

#### From UX Design Document:
- **Feedback visuel immédiat** : Combinaison synchronisée animation + son + texte pour célébrations
- **Reconnaissance sociale instantanée** : Affichage public de la photo de profil pendant 5-8 secondes
- **Gamification inclusive** : Équilibre compétition/rétention avec difficulté progressive
- **Design émotionnel** : Excitation, fierté, motivation intrinsèque comme objectifs principaux
- **Zero-friction participation** : Interaction intuitive via chat TikTok connu
- **Animations celebration** : Particle burst, screen shake, glow effects pour moments spéciaux
- **Accessibilité streaming** : Lisibilité optimale sur différentes qualités de stream
- **Performance overlay** : Animations GPU-accelerated, cleanup automatique des effets

### FR Coverage Map

FR1: Epic 1 - Connexion automatique au chat TikTok via tiktok-live-connector
FR2: Epic 1 - Écoute en temps réel des commentaires TikTok
FR3: Epic 1 - Gestion de la reconnexion automatique en cas de déconnexion
FR4: Epic 1 - Affichage automatique des questions à l'écran via overlay OBS
FR5: Epic 2 - Stockage des questions dans un fichier JSON (MVP)
FR6: Epic 2 - Rotation automatique des questions après réponse ou expiration
FR7: Epic 2 - Parsing automatique des commentaires pour détecter les réponses
FR8: Epic 2 - Validation des réponses (matching exact ou partiel)
FR9: Epic 2 - Identification du premier gagnant pour chaque question
FR10: Epic 2 - Rate limiting (une réponse par viewer par question)
FR11: Epic 3 - Affichage de la photo de profil du gagnant à l'écran
FR12: Epic 3 - Message "Vous avez gagné" avec le nom du gagnant
FR13: Epic 3 - Text-to-Speech automatique pour annoncer le gagnant
FR14: Epic 3 - Attribution automatique de points selon la difficulté de la question
FR15: Epic 4 - Stockage persistant des scores en base de données
FR16: Epic 4 - Leaderboard temps réel affichant le Top 10
FR17: Epic 4 - Reset hebdomadaire du leaderboard
FR18: Epic 5 - Sons audio déclenchés automatiquement par les événements
FR19: Epic 5 - Effets visuels synchronisés avec les événements importants
FR20: Epic 5 - Synchronisation audio/visuelle parfaite
FR21: Epic 6 - API Backend pour Gestion des Données
FR22: Epic 6 - Base de Données pour Questions/Scores/Sessions/Users
FR23: Epic 6 - Cache pour Leaderboard Temps Réel
FR24: Epic 6 - Synchronisation Temps Réel des Événements

## Epic List

### Epic 1: Infrastructure de Streaming Connectée
Permettre aux créateurs de se connecter à TikTok Live et d'afficher automatiquement des questions pour créer la base d'un live interactif
**FRs couverts:** FR1, FR2, FR3, FR4

### Epic 2: Participation au Quiz
Permettre aux viewers de répondre aux questions via le chat TikTok avec détection automatique et équitable des gagnants
**FRs couverts:** FR5, FR6, FR7, FR8, FR9, FR10

### Epic 3: Célébration des Victoires
Faire ressentir aux gagnants une reconnaissance sociale immédiate et excitante avec affichage visuel et annonce TTS
**FRs couverts:** FR11, FR12, FR13, FR14

### Epic 4: Système de Points & Classement
Créer une motivation intrinsèque via progression visible et compétition saine avec leaderboard temps réel
**FRs couverts:** FR15, FR16, FR17

### Epic 5: Expérience Audio-Visuelle Immersive
Enrichir l'expérience avec sons et effets synchronisés pour créer une ambiance engageante et professionnelle
**FRs couverts:** FR18, FR19, FR20

### Epic 6: Architecture Temps Réel Robuste
Fournir l'infrastructure technique pour performance et scalabilité avec base de données et communication temps réel
**FRs couverts:** FR21, FR22, FR23, FR24

## Epic 1: Infrastructure de Streaming Connectée

Permettre aux créateurs de se connecter à TikTok Live et d'afficher automatiquement des questions pour créer la base d'un live interactif

### Story 1.1: Configuration de Connexion TikTok

As a créateur TikTok,
I want configurer la connexion à TikTok Live via `tiktok-live-connector`,
So that pouvoir recevoir les commentaires en temps réel pendant mon live.

**Acceptance Criteria:**

**Given** un serveur Windows avec Node.js installé,
**When** je configure la connexion TikTok avec les credentials appropriés,
**Then** l'application se connecte automatiquement au chat TikTok Live.
**And** les erreurs de connexion sont loggées avec des messages explicites.

### Story 1.2: Écoute des Commentaires Temps Réel

As a système TikTokLive,
I want écouter les commentaires TikTok en temps réel,
So that détecter les réponses des viewers instantanément.

**Acceptance Criteria:**

**Given** une connexion TikTok Live établie,
**When** un viewer poste un commentaire dans le chat,
**Then** le système reçoit le commentaire dans les 2 secondes.
**And** le commentaire inclut le nom d'utilisateur et le texte du message.

### Story 1.3: Gestion des Reconnexions Automatiques

As a système TikTokLive,
I want me reconnecter automatiquement en cas de déconnexion TikTok,
So that maintenir la continuité du live sans intervention manuelle.

**Acceptance Criteria:**

**Given** une connexion TikTok Live active,
**When** TikTok se déconnecte (réseau, maintenance, etc.),
**Then** le système tente une reconnexion automatique après 5 secondes.
**And** le processus se répète jusqu'à reconnexion réussie ou arrêt manuel.

### Story 1.4: Interface Overlay OBS pour Questions

As a créateur TikTok,
I want voir les questions affichées dans une interface  overlay OBS,
So that pouvoir intégrer TikTokLive dans mon setup de streaming.

**Acceptance Criteria:**

**Given** une interface web overlay optimisée,
**When** j'ajoute l'URL comme Browser Source dans OBS,
**Then** l'overlay s'affiche correctement sur différentes résolutions d'écran.
**And** l'interface est responsive et adaptée au streaming en direct.

## Epic 2: Participation au Quiz

Permettre aux viewers de répondre aux questions via le chat TikTok avec détection automatique et équitable des gagnants

### Story 2.1: Stockage et Chargement des Questions

As a système TikTokLive,
I want stocker les questions dans un format JSON structuré,
So that pouvoir les charger et les gérer facilement pour les quiz.

**Acceptance Criteria:**

**Given** un fichier JSON avec des questions formatées,
**When** le système démarre,
**Then** toutes les questions sont chargées en mémoire.
**And** chaque question contient texte, réponses possibles, et difficulté.

### Story 2.2: Affichage Automatique des Questions

As a viewer TikTok,
I want voir les questions s'afficher automatiquement à l'écran,
So that pouvoir y répondre via le chat TikTok.

**Acceptance Criteria:**

**Given** une question disponible dans le système,
**When** la question précédente est résolue ou expire,
**Then** la nouvelle question s'affiche automatiquement dans l'overlay OBS.
**And** l'affichage est visible et lisible pour les viewers.

### Story 2.3: Rotation Automatique des Questions

As a système TikTokLive,
I want passer automatiquement à la question suivante,
So that maintenir le rythme du quiz sans interruption manuelle.

**Acceptance Criteria:**

**Given** une question active affichée,
**When** un gagnant est trouvé OU le timer expire (30 secondes),
**Then** la question suivante se charge automatiquement.
**And** le système revient à la première question après la dernière.

### Story 2.4: Parsing des Commentaires du Chat

As a système TikTokLive,
I want analyser les commentaires TikTok pour extraire les réponses,
So that identifier automatiquement les tentatives de réponse des viewers.

**Acceptance Criteria:**

**Given** un flux de commentaires TikTok en temps réel,
**When** un commentaire contient du texte,
**Then** le système extrait le nom d'utilisateur et le texte de la réponse.
**And** les emojis et mentions sont nettoyés pour faciliter le matching.

### Story 2.5: Validation des Réponses

As a système TikTokLive,
I want valider si une réponse du chat correspond à la réponse attendue,
So that déterminer automatiquement si un viewer a répondu correctement.

**Acceptance Criteria:**

**Given** une réponse extraite du chat TikTok,
**When** le système compare avec la réponse attendue,
**Then** il reconnaît les réponses exactes et partielles (fautes mineures).
**And** les réponses incorrectes sont ignorées silencieusement.

### Story 2.6: Identification du Premier Gagnant

As a système TikTokLive,
I want identifier le premier viewer qui donne la bonne réponse,
So that assurer l'équité et récompenser la réactivité.

**Acceptance Criteria:**

**Given** plusieurs réponses correctes arrivent simultanément,
**When** le système traite les réponses dans l'ordre de réception,
**Then** seul le premier viewer correct est désigné comme gagnant.
**And** les autres réponses correctes sont enregistrées comme tentatives valides.

### Story 2.7: Rate Limiting des Réponses

As a système TikTokLive,
I want limiter chaque viewer à une seule réponse par question,
So that prévenir le spam et assurer l'équité entre participants.

**Acceptance Criteria:**

**Given** un viewer a déjà répondu à la question active,
**When** il poste un nouveau commentaire,
**Then** sa réponse est ignorée pour cette question.
**And** le système traite uniquement la première réponse valide de chaque viewer.

## Epic 3: Célébration des Victoires

Faire ressentir aux gagnants une reconnaissance sociale immédiate et excitante avec affichage visuel et annonce TTS

### Story 3.1: Affichage de la Photo de Profil

As a viewer gagnant,
I want voir ma photo de profil s'afficher à l'écran pendant le live,
So that ressentir une reconnaissance sociale immédiate et excitante.

**Acceptance Criteria:**

**Given** un viewer est désigné comme gagnant,
**When** le système récupère sa photo de profil TikTok,
**Then** l'image s'affiche en gros plan dans l'overlay OBS.
**And** l'affichage dure au moins 5 secondes pour être visible par tous.

### Story 3.2: Message de Victoire Personnalisé

As a viewer gagnant,
I want voir un message "Vous avez gagné" avec mon nom affiché,
So that confirmer clairement que c'est bien moi le gagnant.

**Acceptance Criteria:**

**Given** un gagnant est identifié,
**When** sa photo de profil est affichée,
**Then** le message "Vous avez gagné @[nom_utilisateur] !" apparaît simultanément.
**And** le texte est en gros caractères, contrasté et facilement lisible.

### Story 3.3: Annonce Vocale par Text-to-Speech

As a viewer gagnant,
I want entendre mon nom annoncé vocalement pendant le live,
So that bénéficier d'une célébration audio en plus de la visuelle.

**Acceptance Criteria:**

**Given** un gagnant est identifié,
**When** l'affichage visuel se déclenche,
**Then** une voix TTS annonce "Félicitations @[nom_utilisateur], vous avez gagné !".
**And** l'annonce audio est synchronisée avec l'affichage visuel.

### Story 3.4: Attribution Automatique des Points

As a système TikTokLive,
I want attribuer automatiquement des points selon la difficulté de la question,
So that récompenser équitablement les performances des viewers.

**Acceptance Criteria:**

**Given** un gagnant est identifié pour une question,
**When** la célébration se termine,
**Then** les points sont automatiquement crédités à son score.
**And** les points varient selon la difficulté (facile: 10pts, moyen: 20pts, difficile: 30pts).

## Epic 4: Système de Points & Classement

Créer une motivation intrinsèque via progression visible et compétition saine avec leaderboard temps réel

### Story 4.1: Persistance des Scores en Base de Données

As a système TikTokLive,
I want sauvegarder automatiquement tous les scores des viewers,
So that maintenir un historique des performances pour la gamification.

**Acceptance Criteria:**

**Given** un viewer gagne des points lors d'une question,
**When** la célébration se termine,
**Then** son score est automatiquement sauvegardé en base de données.
**And** les données incluent timestamp, question, difficulté et points gagnés.

### Story 4.2: Leaderboard Temps Réel

As a viewer participant,
I want voir le classement des meilleurs scores en temps réel,
So that suivre ma progression et me comparer aux autres participants.

**Acceptance Criteria:**

**Given** des scores sont mis à jour en base de données,
**When** un viewer consulte le leaderboard,
**Then** il voit le Top 10 des scores actuels mis à jour en temps réel.
**And** son propre score et position sont mis en évidence s'il est dans le Top 10.

### Story 4.3: Reset Hebdomadaire du Classement

As a système TikTokLive,
I want remettre à zéro le leaderboard chaque semaine,
So that maintenir la motivation à long terme et créer des objectifs hebdomadaires.

**Acceptance Criteria:**

**Given** une semaine s'est écoulée depuis le dernier reset,
**When** minuit arrive le dimanche,
**Then** tous les scores sont remis à zéro automatiquement.
**And** un historique des classements hebdomadaires est conservé pour référence.

## Epic 5: Expérience Audio-Visuelle Immersive

Enrichir l'expérience avec sons et effets synchronisés pour créer une ambiance engageante et professionnelle

### Story 5.1: Sons Audio pour Événements Clés

As a viewer participant,
I want entendre des sons distincts lors des événements importants,
So that bénéficier d'un feedback audio immersif pendant le live.

**Acceptance Criteria:**

**Given** un événement important se produit (nouvelle question, bonne réponse, victoire),
**When** l'événement est déclenché,
**Then** un son approprié se joue automatiquement (tic-tac pour timer, "ding" pour bonne réponse, fanfare pour victoire).
**And** les sons sont synchronisés avec les événements visuels.

### Story 5.2: Effets Visuels Dynamiques

As a viewer spectateur,
I want voir des effets visuels lors des moments clés du quiz,
So that bénéficier d'une expérience visuellement engageante et professionnelle.

**Acceptance Criteria:**

**Given** un événement important se produit,
**When** l'effet visuel se déclenche,
**Then** des animations appropriées apparaissent (particules pour victoires, glow pour bonnes réponses, transitions fluides).
**And** les effets sont optimisés pour le streaming et ne nuisent pas aux performances.

### Story 5.3: Synchronisation Audio-Visuelle Parfaite

As a système TikTokLive,
I want synchroniser parfaitement les éléments audio et visuels,
So that créer une expérience cohérente et professionnelle pour tous les viewers.

**Acceptance Criteria:**

**Given** plusieurs éléments audio et visuels doivent se déclencher simultanément,
**When** un événement composite se produit (victoire complète),
**Then** tous les éléments (son, affichage, effets) démarrent exactement en même temps.
**And** la latence entre éléments synchronisés ne dépasse pas 100ms.

## Epic 6: Fondations Techniques pour l'Expérience Temps Réel

Permettre aux créateurs et viewers de bénéficier d'une expérience fluide et instantanée grâce à une infrastructure technique robuste qui rend l'interactivité temps réel transparente et fiable.

**FRs couverts:** FR21, FR22, FR23, FR24

### Story 6.1: API Backend pour Gestion des Données

As a créateur TikTok,
I want que le système stocke et récupère automatiquement mes questions et les scores des viewers,
So that me concentrer sur mon contenu pendant que le système gère les données.

**Acceptance Criteria:**

**Given** un créateur qui configure des questions pour son live,
**When** il démarre son live et que les viewers répondent,
**Then** le système stocke automatiquement les questions et scores via des API REST.
**And** il peut récupérer les données pour afficher les statistiques après le live.

### Story 6.2: Base de Données pour Questions

As a système TikTokLive,
I want créer la table des questions quand la première question est ajoutée,
So that commencer avec une base de données légère et l'étendre selon les besoins.

**Acceptance Criteria:**

**Given** aucune table de questions n'existe encore,
**When** un créateur ajoute sa première question,
**Then** le système crée automatiquement la table questions avec les colonnes nécessaires (texte, réponses, difficulté).
**And** les questions suivantes sont stockées dans cette table nouvellement créée.

### Story 6.5: Base de Données pour Scores

As a viewer participant,
I want que mes points soient sauvegardés automatiquement après chaque victoire,
So that retrouver mon score dans les lives suivants et voir ma progression.

**Acceptance Criteria:**

**Given** un viewer qui gagne ses premiers points,
**When** sa première victoire est enregistrée,
**Then** le système crée la table scores avec les colonnes nécessaires (user_id, points, timestamp, question_id).
**And** tous ses scores futurs sont stockés dans cette table pour maintenir son historique.

### Story 6.6: Base de Données pour Sessions de Live

As a créateur TikTok,
I want que chaque live soit enregistré avec ses statistiques,
So that analyser les performances de mes lives et optimiser mon contenu.

**Acceptance Criteria:**

**Given** un créateur démarre son premier live,
**When** le live commence,
**Then** le système crée la table sessions avec les colonnes nécessaires (session_id, creator_id, start_time, end_time).
**And** enregistre automatiquement les métriques du live (nombre de viewers, questions, réponses).

### Story 6.7: Base de Données pour Utilisateurs

As a système TikTokLive,
I want identifier chaque viewer de manière unique lors de sa première interaction,
So that maintenir la cohérence des scores et éviter les fraudes.

**Acceptance Criteria:**

**Given** un nouveau viewer interagit pour la première fois,
**When** il poste son premier commentaire ou gagne ses premiers points,
**Then** le système crée la table users avec les colonnes nécessaires (user_id, tik_tok_username, first_seen, total_points).
**And** associe automatiquement toutes ses interactions futures à son profil unique.

### Story 6.3: Cache pour Leaderboard Temps Réel

As a viewer participant,
I want voir mon score et position se mettre à jour instantanément,
So that ressentir l'excitation de la progression en temps réel sans aucun délai.

**Acceptance Criteria:**

**Given** un viewer qui vient de gagner des points,
**When** il regarde le leaderboard,
**Then** son nouveau score apparaît immédiatement (< 50ms) grâce au cache Redis.
**And** les positions des autres viewers se mettent à jour automatiquement sans lag perceptible.

### Story 6.4: Synchronisation Temps Réel des Événements

As a viewer spectateur,
I want voir les événements (nouvelles questions, victoires) se produire simultanément sur tous les écrans,
So that vivre une expérience collective synchronisée et immersive.

**Acceptance Criteria:**

**Given** plusieurs viewers regardant le même live,
**When** une victoire se produit,
**Then** tous voient l'affichage du gagnant en même temps (< 100ms de différence).
**And** si la connexion est perdue, le système se reconnecte automatiquement sans interruption visible.