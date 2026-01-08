/**
 * Tests unitaires pour le parser de commentaires TikTok
 * Story 2.4: Parsing des Commentaires du Chat
 *
 * Test Structure:
 * - RED Phase: Ces tests échouent initialement car parseComment n'est pas implémenté
 * - GREEN Phase: Implémentation pour faire passer les tests
 * - REFACTOR Phase: Amélioration sans casser les tests
 */

import { CommentParser } from '../../../lib/tiktok/comment-parser';

describe('CommentParser - Story 2.4', () => {
  describe('parseComment - Extraction et Nettoyage', () => {
    it('devrait extraire username et texte depuis WebcastChatMessage', () => {
      // Arrange: Message TikTok simulé selon format tiktok-live-connector
      const rawMessage = {
        user: {
          uniqueId: 'testuser123',
          userId: '12345',
          nickname: 'Test User'
        },
        comment: 'Ceci est un commentaire test',
        timestamp: 1704067200000
      };

      // Act
      const result = CommentParser.parseComment(rawMessage);

      // Assert
      expect(result).not.toBeNull();
      expect(result?.username).toBe('testuser123');
      expect(result?.originalText).toBe('Ceci est un commentaire test');
      expect(result?.cleanedText).toBe('ceci est un commentaire test'); // lowercase, trimmed
    });

    it('devrait nettoyer les emojis du texte', () => {
      // Arrange
      const rawMessage = {
        user: { uniqueId: 'user1', userId: '1', nickname: 'User' },
        comment: 'Réponse A 🎉😊🔥',
        timestamp: Date.now()
      };

      // Act
      const result = CommentParser.parseComment(rawMessage);

      // Assert
      expect(result).not.toBeNull();
      expect(result?.cleanedText).toBe('reponse a'); // Sans emojis, lowercase, sans accents, trimmed
      expect(result?.originalText).toBe('Réponse A 🎉😊🔥'); // Texte original intact
    });

    it('devrait supprimer les mentions (@username)', () => {
      // Arrange
      const rawMessage = {
        user: { uniqueId: 'user2', userId: '2', nickname: 'User' },
        comment: '@streamer Réponse B',
        timestamp: Date.now()
      };

      // Act
      const result = CommentParser.parseComment(rawMessage);

      // Assert
      expect(result).not.toBeNull();
      expect(result?.cleanedText).toBe('reponse b'); // Sans mentions, lowercase, sans accents, trimmed
      expect(result?.originalText).toBe('@streamer Réponse B');
    });

    it('devrait normaliser le texte avec Unicode NFKD', () => {
      // Arrange: Texte avec accents et caractères spéciaux
      const rawMessage = {
        user: { uniqueId: 'user3', userId: '3', nickname: 'User' },
        comment: 'Réponse Ç',
        timestamp: Date.now()
      };

      // Act
      const result = CommentParser.parseComment(rawMessage);

      // Assert
      expect(result).not.toBeNull();
      // Après normalisation NFKD + suppression accents + lowercase + trim
      expect(result?.cleanedText).toBe('reponse c');
    });

    it('devrait gérer un commentaire avec emojis seulement (texte vide après nettoyage)', () => {
      // Arrange
      const rawMessage = {
        user: { uniqueId: 'user4', userId: '4', nickname: 'User' },
        comment: '🎉😊🔥',
        timestamp: Date.now()
      };

      // Act
      const result = CommentParser.parseComment(rawMessage);

      // Assert: Devrait retourner null car texte vide après nettoyage
      expect(result).toBeNull();
    });

    it('devrait gérer des mentions multiples', () => {
      // Arrange
      const rawMessage = {
        user: { uniqueId: 'user5', userId: '5', nickname: 'User' },
        comment: '@user1 @user2 Réponse C',
        timestamp: Date.now()
      };

      // Act
      const result = CommentParser.parseComment(rawMessage);

      // Assert
      expect(result).not.toBeNull();
      expect(result?.cleanedText).toBe('reponse c');
    });

    it('devrait retourner objet structuré ParsedComment avec tous les champs', () => {
      // Arrange
      const rawMessage = {
        user: { uniqueId: 'testuser', userId: '999', nickname: 'Test' },
        comment: 'Test',
        timestamp: 1704067200000
      };

      // Act
      const result = CommentParser.parseComment(rawMessage);

      // Assert
      expect(result).not.toBeNull();
      expect(result).toHaveProperty('username');
      expect(result).toHaveProperty('originalText');
      expect(result).toHaveProperty('cleanedText');
      expect(result).toHaveProperty('timestamp');
      expect(typeof result?.timestamp).toBe('number');
    });
  });

  describe('removeEmojis - Méthode de Nettoyage', () => {
    it('devrait supprimer emojis simples', () => {
      const text = 'Hello 🎉 World';
      const result = CommentParser.removeEmojis(text);
      expect(result).toBe('Hello  World');
    });

    it('devrait supprimer emojis composés', () => {
      const text = 'Test 👨‍👩‍👧‍👦 Family';
      const result = CommentParser.removeEmojis(text);
      expect(result).not.toContain('👨‍👩‍👧‍👦');
    });

    it('devrait gérer texte sans emojis', () => {
      const text = 'No emojis here';
      const result = CommentParser.removeEmojis(text);
      expect(result).toBe('No emojis here');
    });
  });

  describe('removeMentions - Méthode de Nettoyage', () => {
    it('devrait supprimer mention simple', () => {
      const text = '@user Hello';
      const result = CommentParser.removeMentions(text);
      expect(result).toBe(' Hello');
    });

    it('devrait supprimer mentions multiples', () => {
      const text = '@user1 @user2 Hello';
      const result = CommentParser.removeMentions(text);
      expect(result).toBe('  Hello');
    });

    it('devrait gérer texte sans mentions', () => {
      const text = 'No mentions';
      const result = CommentParser.removeMentions(text);
      expect(result).toBe('No mentions');
    });
  });

  describe('normalizeText - Méthode de Nettoyage', () => {
    it('devrait normaliser accents avec NFKD', () => {
      const text = 'Café';
      const result = CommentParser.normalizeText(text);
      // Note: normalize('NFKD') décompose les accents
      expect(result).toMatch(/cafe/i);
    });

    it('devrait convertir en minuscules', () => {
      const text = 'HELLO WORLD';
      const result = CommentParser.normalizeText(text);
      expect(result).toBe('hello world');
    });

    it('devrait trim espaces', () => {
      const text = '  Hello World  ';
      const result = CommentParser.normalizeText(text);
      expect(result).toBe('hello world');
    });
  });

  describe('cleanText - Pipeline Complet', () => {
    it('devrait appliquer le pipeline complet (emojis → mentions → normalize)', () => {
      const text = '@user Réponse 🎉';
      const result = CommentParser.cleanText(text);
      expect(result).toBe('reponse');
    });

    it('devrait gérer texte complexe avec tous cas limites', () => {
      const text = '  @user1 @user2  Réponse Ç 🎉😊  ';
      const result = CommentParser.cleanText(text);
      expect(result).toBe('reponse c');
    });
  });

  describe('Gestion d\'Erreurs - Format Invalide', () => {
    it('devrait retourner null si message est null', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = CommentParser.parseComment(null as any);
      expect(result).toBeNull();
    });

    it('devrait retourner null si message est undefined', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = CommentParser.parseComment(undefined as any);
      expect(result).toBeNull();
    });

    it('devrait retourner null si user.uniqueId manquant', () => {
      const rawMessage = {
        user: { userId: '1', nickname: 'User' },
        comment: 'Test',
        timestamp: Date.now()
      };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = CommentParser.parseComment(rawMessage as any);
      expect(result).toBeNull();
    });

    it('devrait retourner null si comment manquant', () => {
      const rawMessage = {
        user: { uniqueId: 'user', userId: '1', nickname: 'User' },
        timestamp: Date.now()
      };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = CommentParser.parseComment(rawMessage as any);
      expect(result).toBeNull();
    });

    it('devrait retourner null si comment vide après nettoyage', () => {
      const rawMessage = {
        user: { uniqueId: 'user', userId: '1', nickname: 'User' },
        comment: '   ',
        timestamp: Date.now()
      };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = CommentParser.parseComment(rawMessage as any);
      expect(result).toBeNull();
    });
  });

  describe('Format TikTokComment (format interne standardisé)', () => {
    it('devrait parser TikTokComment avec format standardisé', () => {
      // Arrange: Format TikTokComment (format interne)
      const tikTokComment = {
        id: 'comment-123',
        userId: 'user-456',
        username: 'testuser',
        text: 'Réponse A',
        timestamp: new Date(1704067200000),
        sessionId: 'session-789'
      };

      // Act
      const result = CommentParser.parseComment(tikTokComment);

      // Assert
      expect(result).not.toBeNull();
      expect(result?.username).toBe('testuser');
      expect(result?.originalText).toBe('Réponse A');
      expect(result?.cleanedText).toBe('reponse a');
      expect(result?.timestamp).toBe(1704067200000);
    });

    it('devrait parser TikTokComment avec timestamp number', () => {
      // Arrange
      const tikTokComment = {
        id: 'comment-1',
        userId: 'user-1',
        username: 'user1',
        text: 'Test',
        timestamp: 1704067200000, // Number au lieu de Date
        sessionId: 'session-1'
      };

      // Act
      const result = CommentParser.parseComment(tikTokComment);

      // Assert
      expect(result).not.toBeNull();
      expect(result?.timestamp).toBe(1704067200000);
    });
  });

  describe('Performance - Parsing < 50ms', () => {
    it('devrait parser 100 commentaires en moins de 50ms au total', () => {
      const startTime = Date.now();

      for (let i = 0; i < 100; i++) {
        const rawMessage = {
          user: { uniqueId: `user${i}`, userId: `${i}`, nickname: `User ${i}` },
          comment: `@streamer Réponse ${i} 🎉`,
          timestamp: Date.now()
        };
        CommentParser.parseComment(rawMessage);
      }

      const endTime = Date.now();
      const elapsedTime = endTime - startTime;

      expect(elapsedTime).toBeLessThan(50);
    });
  });
});
