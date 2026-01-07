'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import type { WebSocketEvents, Question, Score, PartialAnswer } from '@/types/quiz';

type EventHandler<K extends keyof WebSocketEvents> = WebSocketEvents[K];

interface UseWebSocketReturn {
  isConnected: boolean;
  on: <K extends keyof WebSocketEvents>(event: K, handler: EventHandler<K>) => void;
  off: <K extends keyof WebSocketEvents>(event: K, handler: EventHandler<K>) => void;
  emit: (event: string, data: any) => void;
}

/**
 * Hook WebSocket pour communication temps réel
 * TODO: Remplacer par socket.io-client en production
 * Pour l'instant, utilise un mock pour la démo visuelle
 */
export function useWebSocket(url?: string): UseWebSocketReturn {
  const [isConnected, setIsConnected] = useState(false);
  const listenersRef = useRef<Map<string, Set<Function>>>(new Map());

  const on = useCallback(<K extends keyof WebSocketEvents>(
    event: K,
    handler: EventHandler<K>
  ) => {
    if (!listenersRef.current.has(event)) {
      listenersRef.current.set(event, new Set());
    }
    listenersRef.current.get(event)?.add(handler as Function);
  }, []);

  const off = useCallback(<K extends keyof WebSocketEvents>(
    event: K,
    handler: EventHandler<K>
  ) => {
    listenersRef.current.get(event)?.delete(handler as Function);
  }, []);

  const emit = useCallback((event: string, data: any) => {
    const listeners = listenersRef.current.get(event);
    if (listeners) {
      listeners.forEach(handler => handler(data));
    }
  }, []);

  // Simuler la connexion
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsConnected(true);
    }, 500);

    return () => clearTimeout(timer);
  }, []);

  return {
    isConnected,
    on,
    off,
    emit,
  };
}

/**
 * Hook pour simuler des données de quiz pour la démo
 */
export function useMockQuizData() {
  const ws = useWebSocket();
  const hasInitializedRef = useRef(false);
  const emitRef = useRef(ws.emit);

  // Mettre à jour la référence emit à chaque fois que ws change
  useEffect(() => {
    emitRef.current = ws.emit;
  }, [ws.emit]);

  useEffect(() => {
    // Ne s'exécuter qu'une seule fois quand la connexion est établie
    if (!ws.isConnected || hasInitializedRef.current) return;
    
    hasInitializedRef.current = true;

    // Afficher une question immédiatement au chargement
    const mockQuestion: Question = {
      id: '1',
      question: 'Quelle est la capitale de la France ?',
      reponses: [
        { texte: 'Paris', correcte: true },
        { texte: 'Lyon', correcte: false },
        { texte: 'Marseille', correcte: false },
      ],
      indices: ['Ville de la Tour Eiffel', 'Ville lumière'],
      theme: 'Géographie',
      difficulte: 'facile',
      created_at: new Date(),
      expires_at: new Date(Date.now() + 86400000),
      active: true,
    };

    emitRef.current('question:new', mockQuestion);
    emitRef.current('timer:start', 60);

    // Simuler le leaderboard initial
    const leaderboardTimer = setTimeout(() => {
      const mockScores: Score[] = [
        { user_id: '1', username: 'CyberNinja', points: 150, last_answer_at: new Date() },
        { user_id: '2', username: 'NeonDragon', points: 142, last_answer_at: new Date() },
        { user_id: '3', username: 'PixelMaster', points: 138, last_answer_at: new Date() },
        { user_id: '4', username: 'GlitchQueen', points: 125, last_answer_at: new Date() },
        { user_id: '5', username: 'ByteWarrior', points: 118, last_answer_at: new Date() },
        { user_id: '6', username: 'VoidRunner', points: 95, last_answer_at: new Date() },
        { user_id: '7', username: 'NeonSamurai', points: 87, last_answer_at: new Date() },
        { user_id: '8', username: 'DataPhantom', points: 76, last_answer_at: new Date() },
        { user_id: '9', username: 'CodeNinja', points: 64, last_answer_at: new Date() },
        { user_id: '10', username: 'DigitalGhost', points: 52, last_answer_at: new Date() },
      ];

      emitRef.current('leaderboard:update', mockScores);
    }, 1500);

    // Simuler des réponses progressives
    const answerTimers: NodeJS.Timeout[] = [];
    
    const answersTimer = setTimeout(() => {
      const partialAnswers: PartialAnswer[] = [
        { userId: '11', username: 'Player1', text: 'P____', timestamp: new Date() },
        { userId: '12', username: 'Player2', text: 'Pa___', timestamp: new Date() },
        { userId: '13', username: 'Player3', text: 'Par__', timestamp: new Date() },
      ];

      partialAnswers.forEach((answer, index) => {
        const timer = setTimeout(() => {
          emitRef.current('answer:update', answer);
        }, 3000 + index * 800);
        answerTimers.push(timer);
      });

      // Simuler une bonne réponse après les essais
      const correctTimer = setTimeout(() => {
        emitRef.current('answer:correct', {
          userId: '14',
          username: 'NeonWinner',
          points: 1,
        });
      }, 6000);
      answerTimers.push(correctTimer);
    }, 3000);

    return () => {
      clearTimeout(leaderboardTimer);
      clearTimeout(answersTimer);
      answerTimers.forEach(timer => clearTimeout(timer));
    };
  }, [ws.isConnected]);

  return ws;
}
