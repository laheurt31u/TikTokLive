/**
 * Tests pour schémas de validation Zod
 * Story 2.4: Parsing des Commentaires du Chat
 */

import {
  WebcastChatMessageSchema,
  ParsedCommentSchema,
  AnswerReceivedPayloadSchema,
  WebSocketEventSchema,
  validateWebcastChatMessage,
  validateAnswerReceivedPayload
} from '../../../lib/validation/comment-schemas';

describe('Comment Validation Schemas - Story 2.4', () => {
  describe('WebcastChatMessageSchema', () => {
    it('devrait valider message TikTok correct', () => {
      const validMessage = {
        user: {
          uniqueId: 'testuser',
          userId: '123',
          nickname: 'Test User'
        },
        comment: 'Commentaire test',
        timestamp: 1704067200000
      };

      const result = WebcastChatMessageSchema.safeParse(validMessage);
      expect(result.success).toBe(true);
    });

    it('devrait rejeter message sans user.uniqueId', () => {
      const invalidMessage = {
        user: {
          userId: '123',
          nickname: 'Test'
        },
        comment: 'Test',
        timestamp: 1704067200000
      };

      const result = WebcastChatMessageSchema.safeParse(invalidMessage);
      expect(result.success).toBe(false);
    });

    it('devrait rejeter message sans comment', () => {
      const invalidMessage = {
        user: {
          uniqueId: 'test',
          userId: '123',
          nickname: 'Test'
        },
        timestamp: 1704067200000
      };

      const result = WebcastChatMessageSchema.safeParse(invalidMessage);
      expect(result.success).toBe(false);
    });

    it('devrait rejeter timestamp négatif', () => {
      const invalidMessage = {
        user: {
          uniqueId: 'test',
          userId: '123',
          nickname: 'Test'
        },
        comment: 'Test',
        timestamp: -1
      };

      const result = WebcastChatMessageSchema.safeParse(invalidMessage);
      expect(result.success).toBe(false);
    });
  });

  describe('ParsedCommentSchema', () => {
    it('devrait valider ParsedComment correct', () => {
      const validComment = {
        username: 'testuser',
        originalText: 'Réponse A',
        cleanedText: 'reponse a',
        timestamp: 1704067200000
      };

      const result = ParsedCommentSchema.safeParse(validComment);
      expect(result.success).toBe(true);
    });

    it('devrait accepter questionId optionnel', () => {
      const commentWithQuestion = {
        username: 'testuser',
        originalText: 'Réponse',
        cleanedText: 'reponse',
        timestamp: 1704067200000,
        questionId: 'question-123'
      };

      const result = ParsedCommentSchema.safeParse(commentWithQuestion);
      expect(result.success).toBe(true);
    });

    it('devrait rejeter cleanedText vide', () => {
      const invalidComment = {
        username: 'test',
        originalText: 'Test',
        cleanedText: '',
        timestamp: 1704067200000
      };

      const result = ParsedCommentSchema.safeParse(invalidComment);
      expect(result.success).toBe(false);
    });
  });

  describe('AnswerReceivedPayloadSchema', () => {
    it('devrait valider payload answer:received correct', () => {
      const validPayload = {
        username: 'testuser',
        cleanedText: 'reponse a',
        questionId: 'question-123',
        timestamp: 1704067200000
      };

      const result = AnswerReceivedPayloadSchema.safeParse(validPayload);
      expect(result.success).toBe(true);
    });

    it('devrait rejeter payload sans questionId', () => {
      const invalidPayload = {
        username: 'test',
        cleanedText: 'reponse',
        timestamp: 1704067200000
      };

      const result = AnswerReceivedPayloadSchema.safeParse(invalidPayload);
      expect(result.success).toBe(false);
    });

    it('devrait rejeter questionId vide', () => {
      const invalidPayload = {
        username: 'test',
        cleanedText: 'reponse',
        questionId: '',
        timestamp: 1704067200000
      };

      const result = AnswerReceivedPayloadSchema.safeParse(invalidPayload);
      expect(result.success).toBe(false);
    });
  });

  describe('WebSocketEventSchema', () => {
    it('devrait valider événement WebSocket correct', () => {
      const validEvent = {
        type: 'answer:received',
        payload: { test: 'data' },
        timestamp: '2024-01-01T00:00:00.000Z',
        sessionId: 'session-123'
      };

      const result = WebSocketEventSchema.safeParse(validEvent);
      expect(result.success).toBe(true);
    });

    it('devrait rejeter timestamp non-ISO8601', () => {
      const invalidEvent = {
        type: 'answer:received',
        payload: {},
        timestamp: 'not-iso-8601',
        sessionId: 'session-123'
      };

      const result = WebSocketEventSchema.safeParse(invalidEvent);
      expect(result.success).toBe(false);
    });
  });

  describe('validateWebcastChatMessage helper', () => {
    it('devrait retourner success=true pour message valide', () => {
      const validMessage = {
        user: {
          uniqueId: 'test',
          userId: '1',
          nickname: 'Test'
        },
        comment: 'Test',
        timestamp: 1704067200000
      };

      const result = validateWebcastChatMessage(validMessage);
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.errors).toBeUndefined();
    });

    it('devrait retourner success=false avec erreurs pour message invalide', () => {
      const invalidMessage = {
        user: { userId: '1', nickname: 'Test' },
        timestamp: 1704067200000
      };

      const result = validateWebcastChatMessage(invalidMessage);
      expect(result.success).toBe(false);
      expect(result.data).toBeUndefined();
      expect(result.errors).toBeDefined();
      expect(result.errors!.length).toBeGreaterThan(0);
    });

    it('devrait formatter les erreurs lisiblement', () => {
      const invalidMessage = {};

      const result = validateWebcastChatMessage(invalidMessage);
      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
      // Vérifier qu'il y a au moins une erreur
      expect(result.errors!.length).toBeGreaterThan(0);
      expect(typeof result.errors![0]).toBe('string');
    });
  });

  describe('validateAnswerReceivedPayload helper', () => {
    it('devrait retourner success=true pour payload valide', () => {
      const validPayload = {
        username: 'test',
        cleanedText: 'reponse',
        questionId: 'question-1',
        timestamp: 1704067200000
      };

      const result = validateAnswerReceivedPayload(validPayload);
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.errors).toBeUndefined();
    });

    it('devrait retourner success=false avec erreurs pour payload invalide', () => {
      const invalidPayload = {
        username: 'test'
      };

      const result = validateAnswerReceivedPayload(invalidPayload);
      expect(result.success).toBe(false);
      expect(result.data).toBeUndefined();
      expect(result.errors).toBeDefined();
      expect(result.errors!.length).toBeGreaterThan(0);
    });
  });
});
