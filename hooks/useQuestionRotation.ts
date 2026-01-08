/**
 * Hook pour gérer la rotation automatique des questions
 * Story 2.3 - Rotation Automatique des Questions
 * 
 * Combine useCurrentQuestion et useQuestionTimer pour gérer
 * la rotation automatique basée sur timer ou gagnant
 */

import { useEffect, useCallback, useRef, useState } from 'react';
import { useCurrentQuestion } from './useCurrentQuestion';
import { useQuestionTimer } from './useQuestionTimer';
import { getNextQuestionIndex, shouldRotate, RotationTrigger } from '@/lib/gamification/question-rotation';
import { CorrelationManager } from '@/lib/logger/correlation';
import { useWebSocket } from './useWebSocket';

export interface UseQuestionRotationReturn {
  currentQuestion: ReturnType<typeof useCurrentQuestion>['currentQuestion'];
  isLoading: boolean;
  error: Error | null;
  timeRemaining: number;
  isExpired: boolean;
  isTransitioning: boolean;
}

/**
 * Valide et normalise la durée de célébration
 * @param rawDuration Durée brute depuis variable d'environnement
 * @returns Durée validée (min: 3000ms, max: 10000ms, défaut: 5000ms)
 */
function validateCelebrationDuration(rawDuration: string | undefined): number {
  const parsed = parseInt(rawDuration || '5000', 10);
  
  if (isNaN(parsed) || parsed < 3000) {
    if (typeof console !== 'undefined' && console.warn) {
      console.warn('[useQuestionRotation] Durée célébration invalide, utilisation de 5000ms par défaut:', rawDuration);
    }
    return 5000;
  }
  
  if (parsed > 10000) {
    if (typeof console !== 'undefined' && console.warn) {
      console.warn('[useQuestionRotation] Durée célébration trop élevée, limitation à 10000ms:', parsed);
    }
    return 10000;
  }
  
  return parsed;
}

/**
 * Durée de célébration avant rotation (5-8 secondes selon AC 3)
 */
const CELEBRATION_DURATION_MS = validateCelebrationDuration(process.env.NEXT_PUBLIC_CELEBRATION_DURATION);

/**
 * Durée de l'animation de transition (fade-out)
 */
const TRANSITION_ANIMATION_DURATION_MS = 300;

/**
 * Hook pour gérer la rotation automatique des questions
 * @returns État de la rotation et question courante
 */
export function useQuestionRotation(): UseQuestionRotationReturn {
  const {
    currentQuestion,
    isLoading,
    error,
    nextQuestion,
    refreshQuestion
  } = useCurrentQuestion();
  
  const {
    timeRemaining,
    isExpired,
    startTimer,
    stopTimer,
    resetTimer
  } = useQuestionTimer();
  
  const { isConnected, sendMessage } = useWebSocket();
  const [isTransitioning, setIsTransitioning] = useState<boolean>(false);
  const celebrationTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const previousQuestionIdRef = useRef<string | null>(null);

  /**
   * Émet l'événement question:next via WebSocket
   */
  const emitQuestionNext = useCallback((questionIndex: number) => {
    // Validation : ne pas émettre si pas de question courante
    if (!currentQuestion) {
      const correlationId = CorrelationManager.getCurrentContext()?.id || CorrelationManager.generateId();
      if (typeof console !== 'undefined' && console.warn) {
        console.warn('[useQuestionRotation] Tentative d\'émission question:next sans question courante', {
          questionIndex,
          correlationId
        });
      }
      return;
    }

    const correlationId = CorrelationManager.getCurrentContext()?.id || CorrelationManager.generateId();
    
    // Récupérer sessionId depuis localStorage ou contexte (fallback: 'default')
    const sessionId = typeof window !== 'undefined' 
      ? (localStorage.getItem('tiktoklive_session_id') || 'default')
      : 'default';
    
    // Émettre événement WebSocket pour synchronisation (si connecté)
    if (isConnected && sendMessage) {
      try {
        sendMessage({
          type: 'question:next',
          payload: {
            question: currentQuestion,
            questionIndex
          },
          timestamp: new Date().toISOString(),
          sessionId,
          correlationId
        });
      } catch (error) {
        // Gérer erreur d'émission WebSocket gracieusement
        const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue lors de l\'émission WebSocket';
        if (typeof console !== 'undefined' && console.error) {
          console.error('[useQuestionRotation] Erreur lors de l\'émission WebSocket:', {
            error: errorMessage,
            questionIndex,
            questionId: currentQuestion?.id,
            correlationId
          });
        }
      }
    } else {
      // WebSocket déconnecté : logger pour debugging mais continuer avec événement local
      if (typeof console !== 'undefined' && console.warn) {
        console.warn('[useQuestionRotation] WebSocket déconnecté, rotation locale uniquement:', {
          questionIndex,
          questionId: currentQuestion?.id,
          isConnected,
          hasSendMessage: !!sendMessage,
          correlationId
        });
      }
    }

    // Toujours émettre événement personnalisé pour compatibilité locale (même si WebSocket déconnecté)
    const nextEvent = new CustomEvent('question:next', {
      detail: {
        type: 'question:next',
        payload: {
          question: currentQuestion,
          questionIndex
        },
        timestamp: new Date().toISOString(),
        sessionId,
        correlationId
      }
    });
    
    if (typeof window !== 'undefined') {
      window.dispatchEvent(nextEvent);
    }

    // Logger pour debugging
    if (typeof console !== 'undefined' && console.info) {
      console.info('[useQuestionRotation] Rotation vers question suivante:', {
        questionIndex,
        questionId: currentQuestion?.id,
        isConnected,
        correlationId
      });
    }
  }, [isConnected, sendMessage, currentQuestion]);

  /**
   * Effectue la rotation vers la question suivante
   */
  const rotateToNext = useCallback((trigger: RotationTrigger) => {
    if (!shouldRotate(trigger)) {
      return;
    }

    const correlationId = CorrelationManager.getCurrentContext()?.id || CorrelationManager.generateId();
    
    try {
      // Déclencher transition
      setIsTransitioning(true);
      
      // Arrêter le timer si actif
      stopTimer();

      // Logger la rotation
      if (typeof console !== 'undefined' && console.info) {
        console.info('[useQuestionRotation] Rotation déclenchée:', {
          trigger,
          questionId: currentQuestion?.id,
          correlationId
        });
      }

      // Attendre la fin de l'animation de sortie (300ms selon QuestionDisplay)
      setTimeout(() => {
        try {
          // Passer à la question suivante
          nextQuestion();
          
          // Réinitialiser le timer pour la nouvelle question
          resetTimer();
          startTimer();
          
          // Fin de la transition
          setIsTransitioning(false);
        } catch (error) {
          // Gestion d'erreur gracieuse
          const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue lors de la rotation';
          const errorCorrelationId = CorrelationManager.getCurrentContext()?.id || CorrelationManager.generateId();
          
          if (typeof console !== 'undefined' && console.error) {
            console.error('[useQuestionRotation] Erreur lors de la rotation:', {
              error: errorMessage,
              trigger,
              questionId: currentQuestion?.id,
              correlationId: errorCorrelationId
            });
          }
          
          // Réinitialiser l'état en cas d'erreur
          setIsTransitioning(false);
          resetTimer();
        }
      }, TRANSITION_ANIMATION_DURATION_MS); // Durée animation fade-out
    } catch (error) {
      // Gestion d'erreur pour la partie initiale
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue lors de l\'initialisation de la rotation';
      const errorCorrelationId = CorrelationManager.getCurrentContext()?.id || CorrelationManager.generateId();
      
      if (typeof console !== 'undefined' && console.error) {
        console.error('[useQuestionRotation] Erreur lors de l\'initialisation de la rotation:', {
          error: errorMessage,
          trigger,
          correlationId: errorCorrelationId
        });
      }
      
      setIsTransitioning(false);
    }
  }, [currentQuestion, nextQuestion, stopTimer, resetTimer, startTimer]);

  /**
   * Gère l'expiration du timer
   */
  useEffect(() => {
    if (isExpired) {
      rotateToNext('timer-expired');
    }
  }, [isExpired, rotateToNext]);

  /**
   * Écoute l'événement winner:announced (Story 2.6 - future)
   */
  useEffect(() => {
    const handleWinnerAnnounced = (event: CustomEvent) => {
      const correlationId = CorrelationManager.getCurrentContext()?.id || CorrelationManager.generateId();
      
      if (typeof console !== 'undefined' && console.info) {
        console.info('[useQuestionRotation] Gagnant annoncé, transition après célébration:', {
          winner: event.detail?.winner,
          correlationId
        });
      }

      // Arrêter le timer immédiatement
      stopTimer();

      // Déclencher transition après célébration (5-8 secondes selon AC 3)
      celebrationTimeoutRef.current = setTimeout(() => {
        rotateToNext('winner');
        celebrationTimeoutRef.current = null;
      }, CELEBRATION_DURATION_MS);
    };

    window.addEventListener('winner:announced', handleWinnerAnnounced as EventListener);

    return () => {
      window.removeEventListener('winner:announced', handleWinnerAnnounced as EventListener);
      if (celebrationTimeoutRef.current) {
        clearTimeout(celebrationTimeoutRef.current);
        celebrationTimeoutRef.current = null;
      }
    };
  }, [stopTimer, rotateToNext]);

  /**
   * Écoute les événements de rotation depuis WebSocket (autres clients)
   */
  useEffect(() => {
    if (!isConnected) {
      return;
    }

    const handleWebSocketMessage = (event: CustomEvent) => {
      const data = event.detail;

      if (data.type === 'question:next') {
        const correlationId = CorrelationManager.getCurrentContext()?.id || CorrelationManager.generateId();
        
        if (typeof console !== 'undefined' && console.info) {
          console.info('[useQuestionRotation] Rotation reçue via WebSocket:', {
            questionIndex: data.payload?.questionIndex,
            correlationId
          });
        }

        // Synchroniser avec la rotation reçue
        // Note: useCurrentQuestion écoute déjà question:new, donc la question sera mise à jour automatiquement
        // On réinitialise juste le timer
        resetTimer();
        startTimer();
      }
    };

    window.addEventListener('websocket:message', handleWebSocketMessage as EventListener);

    return () => {
      window.removeEventListener('websocket:message', handleWebSocketMessage as EventListener);
    };
  }, [isConnected, resetTimer, startTimer]);

  /**
   * Démarre le timer quand une nouvelle question est chargée
   */
  useEffect(() => {
    if (currentQuestion && currentQuestion.id !== previousQuestionIdRef.current) {
      previousQuestionIdRef.current = currentQuestion.id;
      
      // Réinitialiser et démarrer le timer pour la nouvelle question
      resetTimer();
      startTimer();
    }
  }, [currentQuestion, resetTimer, startTimer]);

  /**
   * Nettoyage au démontage
   */
  useEffect(() => {
    return () => {
      if (celebrationTimeoutRef.current) {
        clearTimeout(celebrationTimeoutRef.current);
        celebrationTimeoutRef.current = null;
      }
      stopTimer();
    };
  }, [stopTimer]);

  return {
    currentQuestion,
    isLoading,
    error,
    timeRemaining,
    isExpired,
    isTransitioning
  };
}
