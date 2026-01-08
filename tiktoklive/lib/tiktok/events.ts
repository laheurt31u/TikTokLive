/**
 * Gestion des événements TikTok Live - séparation des responsabilités
 * Implémente les patterns d'événements pour commentaires temps réel
 */

import { TikTokEvent, TikTokComment } from './types';
import { MetricsCollector } from '../logger/metrics';
import { CorrelationManager } from '../logger/correlation';

/**
 * Gestionnaire d'événements pour les commentaires TikTok
 */
export class TikTokEventManager {
  private correlationId: string;

  constructor(correlationId: string) {
    this.correlationId = correlationId;
  }

  /**
   * Traite un événement de commentaire reçu
   */
  async processCommentEvent(
    rawMessage: any,
    parseAndValidateComment: (message: any, receivedAt: number) => TikTokComment | null,
    recordCommentSuccess: () => void,
    recordCommentFailure: () => void,
    emitEvent: (event: TikTokEvent) => void
  ): Promise<void> {
    const startTime = Date.now();

    try {
      // Validation et parsing des données de commentaire
      const validatedComment = parseAndValidateComment(rawMessage, startTime);

      if (validatedComment) {
        // Mesure de latence
        const latency = Date.now() - startTime;

        // Vérifier les seuils NFR (< 2s)
        if (latency > 2000) {
          MetricsCollector.recordMetric(
            'comment.latency.violation',
            latency,
            'ms',
            {
              sessionId: validatedComment.sessionId,
              correlationId: this.correlationId,
              severity: 'high'
            }
          );
        }

        // Enregistrer le succès dans le circuit breaker
        recordCommentSuccess();

        // Logging structuré avec métriques
        MetricsCollector.recordCommentReceived(
          validatedComment.sessionId,
          latency,
          {
            correlationId: this.correlationId,
            userId: validatedComment.userId,
            commentId: validatedComment.id
          }
        );

        // Créer l'événement comment avec métriques complètes
        const commentEvent: TikTokEvent = {
          type: 'comment',
          timestamp: new Date(),
          data: validatedComment,
          correlationId: this.correlationId,
          latency
        };

        emitEvent(commentEvent);

      } else {
        // Enregistrer l'échec dans le circuit breaker
        recordCommentFailure();

        // Événements d'erreur sont émis immédiatement
        emitEvent({
          type: 'error',
          timestamp: new Date(),
          data: {
            error: 'Comment parsing failed',
            operation: 'comment-parsing',
            rawMessage: rawMessage
          },
          correlationId: this.correlationId
        });
      }
    } catch (error) {
      // Gestion d'erreur avec logging
      MetricsCollector.recordError(
        error as Error,
        'high',
        {
          correlationId: this.correlationId,
          operation: 'comment-processing',
          rawMessage: JSON.stringify(rawMessage).substring(0, 200)
        }
      );

      emitEvent({
        type: 'error',
        timestamp: new Date(),
        data: {
          error: (error as Error).message,
          operation: 'comment-processing',
          rawMessage: rawMessage
        },
        correlationId: this.correlationId
      });
    }
  }

  /**
   * Traite un événement de connexion
   */
  async processConnectionEvent(
    connectionState: any,
    emitEvent: (event: TikTokEvent) => void
  ): Promise<void> {
    emitEvent({
      type: 'connect',
      timestamp: new Date(),
      correlationId: this.correlationId,
      data: connectionState
    });
  }

  /**
   * Traite un événement d'erreur
   */
  async processErrorEvent(
    error: any,
    emitEvent: (event: TikTokEvent) => void
  ): Promise<void> {
    const errorMessage = error instanceof Error ? error.message : String(error);

    emitEvent({
      type: 'error',
      timestamp: new Date(),
      data: { error: errorMessage },
      correlationId: this.correlationId
    });
  }

  /**
   * Traite un événement de déconnexion
   */
  async processDisconnectEvent(
    disconnectInfo: any,
    emitEvent: (event: TikTokEvent) => void
  ): Promise<void> {
    emitEvent({
      type: 'disconnect',
      timestamp: new Date(),
      data: disconnectInfo,
      correlationId: this.correlationId
    });
  }
}