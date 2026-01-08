/**
 * Schémas de validation Zod pour commentaires TikTok
 * Story 2.4: Parsing des Commentaires du Chat
 *
 * Responsabilités:
 * - Validation runtime format WebcastChatMessage
 * - Validation payload answer:received
 * - Validation configuration
 */

import { z } from 'zod';

/**
 * Schéma pour WebcastChatMessage (format tiktok-live-connector)
 */
export const WebcastChatMessageSchema = z.object({
  user: z.object({
    uniqueId: z.string().min(1, 'Username (uniqueId) requis'),
    userId: z.string().min(1, 'User ID requis'),
    nickname: z.string().min(1, 'Nickname requis')
  }),
  comment: z.string().min(1, 'Texte commentaire requis'),
  timestamp: z.number().positive('Timestamp doit être positif')
});

/**
 * Type inféré depuis schéma
 */
export type ValidatedWebcastChatMessage = z.infer<typeof WebcastChatMessageSchema>;

/**
 * Schéma pour ParsedComment
 */
export const ParsedCommentSchema = z.object({
  username: z.string().min(1, 'Username requis'),
  originalText: z.string().min(1, 'Texte original requis'),
  cleanedText: z.string().min(1, 'Texte nettoyé requis'),
  timestamp: z.number().positive('Timestamp doit être positif'),
  questionId: z.string().optional()
});

/**
 * Type inféré
 */
export type ValidatedParsedComment = z.infer<typeof ParsedCommentSchema>;

/**
 * Schéma pour payload answer:received
 */
export const AnswerReceivedPayloadSchema = z.object({
  username: z.string().min(1, 'Username requis'),
  cleanedText: z.string().min(1, 'Texte nettoyé requis'),
  questionId: z.string().min(1, 'Question ID requis'),
  timestamp: z.number().positive('Timestamp doit être positif')
});

/**
 * Type inféré
 */
export type ValidatedAnswerReceivedPayload = z.infer<typeof AnswerReceivedPayloadSchema>;

/**
 * Schéma pour événement WebSocket complet
 */
export const WebSocketEventSchema = z.object({
  type: z.string().min(1, 'Type événement requis'),
  payload: z.any(), // Payload varié selon type
  timestamp: z.string().datetime({ message: 'Timestamp doit être ISO 8601' }),
  sessionId: z.string().min(1, 'Session ID requis')
});

/**
 * Type inféré
 */
export type ValidatedWebSocketEvent = z.infer<typeof WebSocketEventSchema>;

/**
 * Helper: Valide un commentaire TikTok brut
 *
 * @param rawMessage - Message brut à valider
 * @returns Résultat validation avec données parsées ou erreurs
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function validateWebcastChatMessage(rawMessage: any): {
  success: boolean;
  data?: ValidatedWebcastChatMessage;
  errors?: string[];
} {
  const result = WebcastChatMessageSchema.safeParse(rawMessage);

  if (result.success) {
    return {
      success: true,
      data: result.data
    };
  }

  // result.success === false, donc result.error existe toujours dans Zod
  return {
    success: false,
    errors: 'error' in result && result.error?.errors
      ? result.error.errors.map(e => `${e.path.join('.')}: ${e.message}`)
      : ['Validation failed']
  };
}

/**
 * Helper: Valide un payload answer:received
 *
 * @param payload - Payload à valider
 * @returns Résultat validation
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function validateAnswerReceivedPayload(payload: any): {
  success: boolean;
  data?: ValidatedAnswerReceivedPayload;
  errors?: string[];
} {
  const result = AnswerReceivedPayloadSchema.safeParse(payload);

  if (result.success) {
    return {
      success: true,
      data: result.data
    };
  }

  // result.success === false, donc result.error existe toujours dans Zod
  return {
    success: false,
    errors: 'error' in result && result.error?.errors
      ? result.error.errors.map(e => `${e.path.join('.')}: ${e.message}`)
      : ['Validation failed']
  };
}
