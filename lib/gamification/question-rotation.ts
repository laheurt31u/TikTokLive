/**
 * Service de rotation automatique des questions
 * Story 2.3 - Rotation Automatique des Questions
 * 
 * Gère la logique de rotation cyclique des questions et la détection
 * des événements déclencheurs (gagnant trouvé, timer expiré)
 */

export type RotationTrigger = 'winner' | 'timer-expired';

/**
 * Calcule l'index de la question suivante dans un cycle
 * @param currentIndex Index de la question actuelle
 * @param totalQuestions Nombre total de questions
 * @returns Index de la question suivante (revient à 0 après la dernière)
 */
export function getNextQuestionIndex(
  currentIndex: number,
  totalQuestions: number
): number {
  // Cas limite : aucune question disponible
  if (totalQuestions === 0) {
    return 0;
  }

  // Calcul du cycle : (index + 1) % total
  return (currentIndex + 1) % totalQuestions;
}

/**
 * Détermine si une rotation est nécessaire selon le déclencheur
 * @param trigger Type de déclencheur (winner ou timer-expired)
 * @returns true si rotation nécessaire, false sinon
 */
export function shouldRotate(trigger: RotationTrigger): boolean {
  // Les deux déclencheurs nécessitent une rotation
  return trigger === 'winner' || trigger === 'timer-expired';
}

/**
 * Calcule l'index suivant avec gestion des cas limites
 * @param currentIndex Index de la question actuelle
 * @param totalQuestions Nombre total de questions
 * @returns Index de la question suivante (avec fallback gracieux pour cas limites)
 */
export function calculateNextIndex(
  currentIndex: number,
  totalQuestions: number
): number {
  // Cas limite : aucune question disponible
  if (totalQuestions === 0) {
    return 0;
  }

  // Cas limite : index invalide (négatif ou supérieur au total)
  if (currentIndex < 0 || currentIndex >= totalQuestions) {
    return 0;
  }

  // Calcul normal du cycle
  return (currentIndex + 1) % totalQuestions;
}
