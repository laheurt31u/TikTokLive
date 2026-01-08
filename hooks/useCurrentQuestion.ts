/**
 * Hook pour gérer la question courante affichée dans l'overlay
 * Story 2.2 - Affichage Automatique des Questions
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { Question } from '@/types/gamification';
import { useWebSocket } from './useWebSocket';
import { CorrelationManager } from '@/lib/logger/correlation';
import { getNextQuestionIndex } from '@/lib/gamification/question-rotation';

interface UseCurrentQuestionReturn {
  currentQuestion: Question | null;
  isLoading: boolean;
  error: Error | null;
  nextQuestion: () => void;
  refreshQuestion: () => void;
}

/**
 * Format d'événement WebSocket pour nouvelle question
 */
interface QuestionNewEvent {
  type: 'question:new';
  payload: Question;
  timestamp: string;
  sessionId: string;
}

/**
 * Hook pour gérer l'état de la question courante
 * Charge les questions depuis l'API et sélectionne automatiquement la première
 * Écoute les événements WebSocket pour synchronisation temps réel
 */
export function useCurrentQuestion(): UseCurrentQuestionReturn {
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [allQuestions, setAllQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  const { isConnected } = useWebSocket();
  const previousQuestionIdRef = useRef<string | null>(null);

  /**
   * Charge les questions depuis l'API avec retry automatique et backoff exponentiel
   * @param retryCount Nombre de tentatives déjà effectuées
   * @param maxRetries Nombre maximum de tentatives (défaut: 3)
   */
  const loadQuestions = useCallback(async (retryCount: number = 0, maxRetries: number = 3) => {
    setIsLoading(true);
    setError(null);

    const correlationId = CorrelationManager.getCurrentContext()?.id || CorrelationManager.generateId();

    try {
      const apiUrl = process.env.NEXT_PUBLIC_QUESTIONS_API_URL || '/api/questions';
      const response = await fetch(apiUrl);

      if (!response.ok) {
        throw new Error(`Erreur HTTP: ${response.status}`);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error?.message || 'Erreur lors du chargement des questions');
      }

      const questions: Question[] = result.data || [];

      if (questions.length === 0) {
        // Pas d'erreur, juste aucune question disponible
        setAllQuestions([]);
        setCurrentQuestion(null);
        setCurrentIndex(0);
      } else {
        setAllQuestions(questions);
        // Sélectionner automatiquement la première question
        setCurrentQuestion(questions[0]);
        setCurrentIndex(0);
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Erreur inconnue lors du chargement');
      
      // Retry automatique avec backoff exponentiel
      if (retryCount < maxRetries) {
        const delay = Math.min(1000 * Math.pow(2, retryCount), 10000); // Max 10 secondes
        
        if (typeof console !== 'undefined' && console.warn) {
          console.warn('[useCurrentQuestion] Erreur de chargement, retry automatique:', {
            message: error.message,
            retryCount: retryCount + 1,
            maxRetries,
            delayMs: delay,
            correlationId
          });
        }

        // Attendre avant de réessayer
        await new Promise(resolve => setTimeout(resolve, delay));
        
        // Réessayer avec incrément du compteur
        return loadQuestions(retryCount + 1, maxRetries);
      }

      // Toutes les tentatives ont échoué
      setError(error);
      setCurrentQuestion(null);
      setAllQuestions([]);
      
      // Logger l'erreur finale avec correlation ID pour debugging
      if (typeof console !== 'undefined' && console.error) {
        console.error('[useCurrentQuestion] Erreur de chargement après toutes les tentatives:', {
          message: error.message,
          stack: error.stack,
          retryCount,
          maxRetries,
          correlationId
        });
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Charge les questions au montage du composant
   */
  useEffect(() => {
    loadQuestions();
  }, [loadQuestions]);

  /**
   * Passe à la question suivante
   * Revient à la première question après la dernière (cycle)
   */
  const nextQuestion = useCallback(() => {
    if (allQuestions.length === 0) {
      return;
    }

    // Utiliser le service de rotation pour cohérence et gestion d'erreurs
    const nextIndex = getNextQuestionIndex(currentIndex, allQuestions.length);
    setCurrentIndex(nextIndex);
    setCurrentQuestion(allQuestions[nextIndex]);
  }, [allQuestions, currentIndex]);

  /**
   * Rafraîchit les questions depuis l'API
   */
  const refreshQuestion = useCallback(() => {
    loadQuestions();
  }, [loadQuestions]);

  /**
   * Écoute les événements WebSocket pour synchronisation temps réel
   */
  useEffect(() => {
    if (!isConnected) {
      return;
    }

    const handleWebSocketMessage = (event: CustomEvent) => {
      const data = event.detail;

      // Support des formats WebSocket : question:new, question:next, et quiz:question (legacy)
      const isQuestionEvent = data.type === 'question:new' || data.type === 'question:next' || data.type === 'quiz:question';
      
      if (isQuestionEvent) {
        try {
          // Normaliser les deux formats d'événements
          let questionPayload: Question;
          
          if (data.type === 'question:new' || data.type === 'question:next') {
            // Format nouveau : { type: 'question:new'|'question:next', payload: Question, ... }
            if (!data.payload || typeof data.payload !== 'object') {
              throw new Error(`Invalid ${data.type} event: missing or invalid payload`);
            }
            // question:next peut avoir payload.question ou payload directement
            const payload = data.payload.question || data.payload;
            if (!payload || typeof payload !== 'object') {
              throw new Error(`Invalid ${data.type} event: missing question in payload`);
            }
            questionPayload = payload as Question;
          } else if (data.type === 'quiz:question') {
            // Format legacy : { type: 'quiz:question', question: string, questionId: string, ... }
            // Adapter le format legacy vers le format Question
            if (!data.questionId || !data.question) {
              throw new Error('Invalid quiz:question event: missing questionId or question');
            }
            questionPayload = {
              id: data.questionId,
              text: data.question,
              answers: data.answers || [],
              difficulty: data.difficulty || 'facile',
              points: data.points || 10,
              category: data.category
            };
          } else {
            throw new Error(`Unsupported question event type: ${data.type}`);
          }

          const newQuestion = questionPayload;

          // Valider que la question a les propriétés requises
          if (!newQuestion.id || !newQuestion.text) {
            throw new Error('Invalid question payload: missing required fields (id, text)');
          }

          // Éviter les mises à jour inutiles si c'est la même question
          if (previousQuestionIdRef.current !== newQuestion.id) {
            setCurrentQuestion(newQuestion);
            previousQuestionIdRef.current = newQuestion.id;

            // Logger avec correlation ID pour debugging
            const correlationId = CorrelationManager.getCurrentContext()?.id || CorrelationManager.generateId();
            if (typeof console !== 'undefined' && console.info) {
              console.info('[useCurrentQuestion] Nouvelle question reçue via WebSocket:', {
                questionId: newQuestion.id,
                eventType: data.type,
                timestamp: data.timestamp || new Date().toISOString(),
                sessionId: data.sessionId || 'unknown',
                correlationId
              });
            }
          }
        } catch (error) {
          // Logger l'erreur de validation avec correlation ID
          const correlationId = CorrelationManager.getCurrentContext()?.id || CorrelationManager.generateId();
          const errorMessage = error instanceof Error ? error.message : 'Unknown validation error';
          if (typeof console !== 'undefined' && console.error) {
            console.error('[useCurrentQuestion] Erreur validation événement WebSocket:', {
              error: errorMessage,
              eventType: data.type,
              correlationId
            });
          }
        }
      }
    };

    // Écouter les événements WebSocket personnalisés
    window.addEventListener('websocket:message', handleWebSocketMessage as EventListener);

    return () => {
      window.removeEventListener('websocket:message', handleWebSocketMessage as EventListener);
    };
  }, [isConnected]);

  /**
   * Récupération de l'état après reconnexion WebSocket
   */
  useEffect(() => {
    if (isConnected && !currentQuestion && allQuestions.length > 0) {
      // Récupérer la première question après reconnexion
      setCurrentQuestion(allQuestions[0]);
      setCurrentIndex(0);
    }
  }, [isConnected, currentQuestion, allQuestions]);

  /**
   * Écoute des événements de résolution/expiration pour transition automatique (AC 1)
   * Story 2.2 - AC 1: "When la question précédente est résolue ou expire, Then la nouvelle question s'affiche automatiquement"
   */
  useEffect(() => {
    const handleQuestionExpired = () => {
      const correlationId = CorrelationManager.getCurrentContext()?.id || CorrelationManager.generateId();
      if (typeof console !== 'undefined' && console.info) {
        console.info('[useCurrentQuestion] Question expirée, transition automatique:', {
          questionId: currentQuestion?.id,
          correlationId
        });
      }
      
      // Transition automatique vers question suivante
      if (allQuestions.length > 0) {
        // Utiliser le service de rotation pour cohérence
        const nextIndex = getNextQuestionIndex(currentIndex, allQuestions.length);
        setCurrentIndex(nextIndex);
        setCurrentQuestion(allQuestions[nextIndex]);
      }
    };

    const handleQuestionResolved = () => {
      const correlationId = CorrelationManager.getCurrentContext()?.id || CorrelationManager.generateId();
      if (typeof console !== 'undefined' && console.info) {
        console.info('[useCurrentQuestion] Question résolue, transition automatique:', {
          questionId: currentQuestion?.id,
          correlationId
        });
      }
      
      // Transition automatique vers question suivante
      if (allQuestions.length > 0) {
        // Utiliser le service de rotation pour cohérence
        const nextIndex = getNextQuestionIndex(currentIndex, allQuestions.length);
        setCurrentIndex(nextIndex);
        setCurrentQuestion(allQuestions[nextIndex]);
      }
    };

    // Écouter les événements d'expiration et de résolution
    // Note: question:expired est émis par useQuestionTimer avec deux-points
    window.addEventListener('question:expired', handleQuestionExpired as EventListener);
    window.addEventListener('question:resolved', handleQuestionResolved as EventListener);

    return () => {
      window.removeEventListener('question:expired', handleQuestionExpired as EventListener);
      window.removeEventListener('question:resolved', handleQuestionResolved as EventListener);
    };
  }, [allQuestions, currentIndex, currentQuestion]);

  return {
    currentQuestion,
    isLoading,
    error,
    nextQuestion,
    refreshQuestion
  };
}
