/**
 * Constantes de timeout pour les tests E2E et de composants
 * Centralise les valeurs de timeout pour faciliter la maintenance
 */

export const TEST_TIMEOUTS = {
  // Timeouts courts pour les interactions rapides
  SHORT: 2000,      // 2 secondes - pour les interactions utilisateur rapides
  MEDIUM: 5000,     // 5 secondes - pour les attentes d'état standard
  LONG: 10000,      // 10 secondes - pour les opérations réseau ou complexes
  VERY_LONG: 15000, // 15 secondes - pour les reconnexions et opérations longues

  // Timeouts spécifiques par type d'opération
  ELEMENT_VISIBILITY: 5000,      // Attente de visibilité d'élément
  NETWORK_RESPONSE: 10000,       // Attente de réponse réseau
  RECONNECTION: 15000,           // Attente de reconnexion
  CIRCUIT_BREAKER: 10000,        // Attente d'activation circuit breaker
  ANIMATION: 5000,               // Attente d'animation
  METRICS_UPDATE: 10000,         // Attente de mise à jour métriques
} as const;
