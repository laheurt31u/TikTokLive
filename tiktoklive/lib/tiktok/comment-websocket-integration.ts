/**
 * Intégration WebSocket pour les commentaires TikTok
 * Story 2.4: Parsing des Commentaires du Chat
 *
 * Responsabilités:
 * - Écouter événements CHAT du connector TikTok
 * - Parser commentaires avec CommentParser
 * - Émettre événement answer:received via WebSocket
 * - Gérer question courante pour contexte
 */

import { TikTokConnector } from './connector';
import { CommentParser, ParsedComment } from './comment-parser';
import { TikTokEvent } from './types';
import { CorrelationManager } from '../logger/correlation';
import { MetricsCollector } from '../logger/metrics';
import { validateAnswerReceivedPayload } from '../validation/comment-schemas';

/**
 * Payload pour événement answer:received
 */
export interface AnswerReceivedPayload {
  username: string;
  cleanedText: string;
  questionId: string;
  timestamp: number;
}

/**
 * Format événement WebSocket standardisé
 */
export interface WebSocketEvent {
  type: string;
  payload: AnswerReceivedPayload | Record<string, unknown>; // Type union pour type safety
  timestamp: string;        // ISO 8601
  sessionId: string;
}

/**
 * Service d'intégration WebSocket pour commentaires TikTok
 *
 * @example
 * ```typescript
 * import { TikTokConnector } from './connector';
 * import { CommentWebSocketIntegration } from './comment-websocket-integration';
 *
 * // Initialiser le connector TikTok
 * const connector = new TikTokConnector('session-id');
 * await connector.initialize(sessionId, cookies);
 * await connector.connect();
 *
 * // Créer l'intégration WebSocket
 * const integration = new CommentWebSocketIntegration();
 *
 * // Fonction pour émettre événements WebSocket (ex: Socket.io)
 * const websocketEmitter = (event: WebSocketEvent) => {
 *   io.emit(event.type, event.payload);
 * };
 *
 * // Initialiser l'intégration
 * integration.initialize(connector, websocketEmitter);
 *
 * // Définir la question courante
 * integration.setCurrentQuestion('question-123');
 *
 * // Les commentaires TikTok seront automatiquement parsés et émis via WebSocket
 * // avec l'événement 'answer:received'
 * ```
 */
export class CommentWebSocketIntegration {
  private connector: TikTokConnector | null = null;
  private eventListenerId: string | null = null;
  private currentQuestionId: string | null = null;
  private websocketEmitter: ((event: WebSocketEvent) => void) | null = null;

  /**
   * Initialise l'intégration avec le connector TikTok
   *
   * @param connector - Instance du connector TikTok
   * @param websocketEmitter - Fonction pour émettre événements WebSocket
   */
  initialize(
    connector: TikTokConnector,
    websocketEmitter: (event: WebSocketEvent) => void
  ): void {
    this.connector = connector;
    this.websocketEmitter = websocketEmitter;

    // Écouter les événements du connector
    this.eventListenerId = this.connector.onEvent((event: TikTokEvent) => {
      this.handleTikTokEvent(event);
    });
  }

  /**
   * Définit la question courante pour contexte
   *
   * @param questionId - ID de la question active
   */
  setCurrentQuestion(questionId: string | null): void {
    this.currentQuestionId = questionId;
  }

  /**
   * Gère les événements TikTok
   */
  private handleTikTokEvent(event: TikTokEvent): void {
    // Ne traiter que les événements de commentaires
    if (event.type !== 'comment') {
      return;
    }

    try {
      const rawComment = event.data;

      // Parser le commentaire avec CommentParser
      const parsedComment = CommentParser.parseComment(rawComment);

      if (!parsedComment) {
        // Commentaire invalide ou vide après nettoyage - ignorer silencieusement
        return;
      }

      // Vérifier si une question est active
      if (!this.currentQuestionId) {
        // Pas de question active - ignorer silencieusement (comportement attendu)
        MetricsCollector.recordMetric(
          'comment.no_active_question',
          1,
          'count',
          { correlationId: event.correlationId }
        );
        return;
      }

      // Émettre événement answer:received via WebSocket
      this.emitAnswerReceived(parsedComment, this.currentQuestionId, event.correlationId);

      // Métriques de succès
      MetricsCollector.recordMetric(
        'comment.parsed_and_broadcasted',
        1,
        'count',
        {
          correlationId: event.correlationId,
          questionId: this.currentQuestionId
        }
      );

    } catch (error) {
      // Logging erreur avec correlation ID
      MetricsCollector.recordError(
        error as Error,
        'medium',
        {
          correlationId: event.correlationId,
          operation: 'comment-websocket-integration'
        }
      );
    }
  }

  /**
   * Émet événement answer:received via WebSocket
   */
  private emitAnswerReceived(
    parsedComment: ParsedComment,
    questionId: string,
    correlationId?: string
  ): void {
    if (!this.websocketEmitter) {
      console.warn('WebSocket emitter non configuré - impossible d\'émettre answer:received');
      return;
    }

    const payload: AnswerReceivedPayload = {
      username: parsedComment.username,
      cleanedText: parsedComment.cleanedText,
      questionId,
      timestamp: parsedComment.timestamp
    };

    // Validation Zod avant émission (architecture Decision-5)
    const validation = validateAnswerReceivedPayload(payload);
    if (!validation.success) {
      // Payload invalide - ne pas émettre
      MetricsCollector.recordError(
        new Error(`Payload answer:received invalide: ${validation.errors?.join(', ')}`),
        'high',
        {
          correlationId,
          operation: 'websocket-payload-validation',
          payload: JSON.stringify(payload).substring(0, 200)
        }
      );
      return;
    }

    // Utiliser payload validé
    const validatedPayload = validation.data!;

    const websocketEvent: WebSocketEvent = {
      type: 'answer:received',
      payload: validatedPayload,
      timestamp: new Date().toISOString(),
      sessionId: correlationId || CorrelationManager.generateId()
    };

    try {
      this.websocketEmitter(websocketEvent);

      // Métriques d'émission
      MetricsCollector.recordMetric(
        'websocket.answer_received.emitted',
        1,
        'count',
        {
          correlationId,
          questionId,
          username: validatedPayload.username
        }
      );

    } catch (error) {
      // Erreur d'émission WebSocket
      MetricsCollector.recordError(
        error as Error,
        'high',
        {
          correlationId,
          operation: 'websocket-emission',
          eventType: 'answer:received'
        }
      );
    }
  }

  /**
   * Arrête l'intégration et nettoie les ressources
   */
  cleanup(): void {
    if (this.connector && this.eventListenerId) {
      this.connector.removeEventListener(this.eventListenerId);
      this.eventListenerId = null;
    }

    this.connector = null;
    this.websocketEmitter = null;
    this.currentQuestionId = null;
  }

  /**
   * Obtient l'ID de la question courante
   */
  getCurrentQuestionId(): string | null {
    return this.currentQuestionId;
  }
}
