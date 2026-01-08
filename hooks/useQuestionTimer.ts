/**
 * Hook pour gérer le timer de question (30 secondes)
 * Story 2.3 - Rotation Automatique des Questions
 * 
 * Gère le compte à rebours de 30 secondes pour chaque question
 * et émet un événement quand le timer expire
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { CorrelationManager } from '@/lib/logger/correlation';

export interface UseQuestionTimerReturn {
  timeRemaining: number;
  isExpired: boolean;
  startTimer: () => void;
  stopTimer: () => void;
  resetTimer: () => void;
}

/**
 * Valide et normalise la durée du timer
 * @param rawDuration Durée brute depuis variable d'environnement
 * @returns Durée validée (min: 5s, max: 300s, défaut: 30s)
 */
function validateTimerDuration(rawDuration: string | undefined): number {
  const parsed = parseInt(rawDuration || '30', 10);
  
  if (isNaN(parsed) || parsed < 5) {
    if (typeof console !== 'undefined' && console.warn) {
      console.warn('[useQuestionTimer] Durée invalide, utilisation de 30s par défaut:', rawDuration);
    }
    return 30;
  }
  
  if (parsed > 300) {
    if (typeof console !== 'undefined' && console.warn) {
      console.warn('[useQuestionTimer] Durée trop élevée, limitation à 300s:', parsed);
    }
    return 300;
  }
  
  return parsed;
}

/**
 * Hook pour gérer le timer de question
 * @param duration Durée du timer en secondes (défaut: validé depuis env)
 * @returns État du timer et fonctions de contrôle
 */
export function useQuestionTimer(
  duration: number = validateTimerDuration(process.env.NEXT_PUBLIC_QUESTION_TIMER_DURATION)
): UseQuestionTimerReturn {
  const [timeRemaining, setTimeRemaining] = useState<number>(duration);
  const [isExpired, setIsExpired] = useState<boolean>(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const isRunningRef = useRef<boolean>(false);

  /**
   * Émet l'événement question:expired via WebSocket
   */
  const emitExpiredEvent = useCallback(() => {
    const correlationId = CorrelationManager.getCurrentContext()?.id || CorrelationManager.generateId();
    
    // Émettre événement personnalisé pour synchronisation WebSocket
    const expiredEvent = new CustomEvent('question:expired', {
      detail: {
        type: 'question:expired',
        timestamp: new Date().toISOString(),
        correlationId
      }
    });
    
    if (typeof window !== 'undefined') {
      window.dispatchEvent(expiredEvent);
    }

    // Logger structuré avec correlation ID pour debugging
    if (typeof console !== 'undefined' && console.info) {
      console.info('[useQuestionTimer] Timer expiré', {
        duration,
        timeRemaining: 0,
        isExpired: true,
        correlationId,
        timestamp: new Date().toISOString()
      });
    }
  }, [duration]);

  /**
   * Démarre le timer
   */
  const startTimer = useCallback(() => {
    if (isRunningRef.current) {
      const correlationId = CorrelationManager.getCurrentContext()?.id || CorrelationManager.generateId();
      if (typeof console !== 'undefined' && console.warn) {
        console.warn('[useQuestionTimer] Tentative de démarrage alors que timer déjà en cours', {
          duration,
          correlationId
        });
      }
      return; // Déjà en cours
    }

    const correlationId = CorrelationManager.getCurrentContext()?.id || CorrelationManager.generateId();
    
    isRunningRef.current = true;
    setIsExpired(false);
    setTimeRemaining(duration);
    
    // Logger structuré avec correlation ID
    if (typeof console !== 'undefined' && console.info) {
      console.info('[useQuestionTimer] Timer démarré', {
        duration,
        timeRemaining: duration,
        correlationId,
        timestamp: new Date().toISOString()
      });
    }

    // Démarrer le compte à rebours
    intervalRef.current = setInterval(() => {
      setTimeRemaining((prev) => {
        const newTime = prev - 1;
        
        if (newTime <= 0) {
          // Timer expiré
          setIsExpired(true);
          isRunningRef.current = false;
          
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
          }
          
          // Émettre événement d'expiration
          emitExpiredEvent();
          
          return 0;
        }
        
        return newTime;
      });
    }, 1000); // Mise à jour chaque seconde
  }, [duration, emitExpiredEvent]);

  /**
   * Arrête le timer
   */
  const stopTimer = useCallback(() => {
    const correlationId = CorrelationManager.getCurrentContext()?.id || CorrelationManager.generateId();
    
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    isRunningRef.current = false;
    
    // Logger structuré avec correlation ID
    if (typeof console !== 'undefined' && console.info) {
      console.info('[useQuestionTimer] Timer arrêté', {
        timeRemaining,
        correlationId,
        timestamp: new Date().toISOString()
      });
    }
  }, [timeRemaining]);

  /**
   * Réinitialise le timer
   */
  const resetTimer = useCallback(() => {
    const correlationId = CorrelationManager.getCurrentContext()?.id || CorrelationManager.generateId();
    
    stopTimer();
    setTimeRemaining(duration);
    setIsExpired(false);
    isRunningRef.current = false;
    
    // Logger structuré avec correlation ID
    if (typeof console !== 'undefined' && console.info) {
      console.info('[useQuestionTimer] Timer réinitialisé', {
        duration,
        timeRemaining: duration,
        correlationId,
        timestamp: new Date().toISOString()
      });
    }
  }, [duration, stopTimer]);

  /**
   * Nettoyage au démontage
   */
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      isRunningRef.current = false;
    };
  }, []);

  return {
    timeRemaining,
    isExpired,
    startTimer,
    stopTimer,
    resetTimer
  };
}
