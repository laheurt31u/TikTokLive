/**
 * Tests Unitaires P2 - Parser et validateur de commentaires TikTok
 * Tests isolés pour la logique de parsing des commentaires
 */

import { TikTokCommentParser } from '../../tiktoklive/lib/tiktok/parser';
import { TikTokComment } from '../../tiktoklive/lib/tiktok/types';

describe('TikTokCommentParser', () => {
  describe('parseAndValidateComment', () => {
    test('[P2] devrait parser un commentaire TikTok valide', () => {
      // GIVEN: Un message brut TikTok valide
      const rawMessage = {
        commentId: 'comment123',
        userId: 'user456',
        username: 'testuser',
        text: 'Ceci est un commentaire de test'
      };
      const receivedAt = Date.now();

      // WHEN: Parsing du commentaire
      const result = TikTokCommentParser.parseAndValidateComment(rawMessage, receivedAt);

      // THEN: Retourne un objet commentaire valide
      expect(result).not.toBeNull();
      expect(result!.id).toBe('comment123');
      expect(result!.userId).toBe('user456');
      expect(result!.username).toBe('testuser');
      expect(result!.text).toBe('Ceci est un commentaire de test');
      expect(result!.sessionId).toBe('unknown-session'); // Défaut si non fourni
    });

    test('[P2] devrait gérer les différents formats de message', () => {
      // GIVEN: Messages avec différents champs
      const testCases = [
        {
          input: { commentId: 'id1', userId: 'u1', username: 'user1', text: 'text1' },
          expected: { id: 'id1', userId: 'u1', username: 'user1', text: 'text1' }
        },
        {
          input: { id: 'id2', sender: { userId: 'u2', username: 'user2' }, content: 'text2' },
          expected: { id: 'id2', userId: 'u2', username: 'user2', text: 'text2' }
        }
      ];

      testCases.forEach(({ input, expected }) => {
        // WHEN: Parsing de chaque format
        const result = TikTokCommentParser.parseAndValidateComment(input, Date.now());

        // THEN: Parsing correct malgré les différences de format
        expect(result).not.toBeNull();
        expect(result!.id).toBe(expected.id);
        expect(result!.userId).toBe(expected.userId);
        expect(result!.username).toBe(expected.username);
        expect(result!.text).toBe(expected.text);
      });
    });

    test('[P2] devrait rejeter les messages invalides', () => {
      // GIVEN: Messages invalides
      const invalidMessages = [
        null,
        undefined,
        'string instead of object',
        { invalidField: 'value' }, // Pas de commentId
        { commentId: '', userId: 'u1' }, // commentId vide
        { commentId: 'id1', userId: '' }, // userId vide
        { commentId: 'id1', userId: 'u1', username: null }, // username null
        { commentId: 'id1', userId: 'u1', username: '', text: 'valid' } // username vide
      ];

      invalidMessages.forEach(invalidMessage => {
        // WHEN: Tentative de parsing
        const result = TikTokCommentParser.parseAndValidateComment(invalidMessage, Date.now());

        // THEN: Retourne null pour les messages invalides
        expect(result).toBeNull();
      });
    });

    test('[P2] devrait nettoyer et valider les noms d\'utilisateur', () => {
      // GIVEN: Noms d'utilisateur avec caractères spéciaux
      const testCases = [
        { input: 'user@domain.com', expected: 'user@domain.com' }, // @ autorisé
        { input: 'user_name.123', expected: 'user_name.123' },    // _ . autorisés
        { input: 'user🚀name', expected: 'username' },            // Emojis supprimés
        { input: 'user@#$%name', expected: 'username' },          // Caractères spéciaux supprimés
        { input: 'a'.repeat(60), expected: 'a'.repeat(50) }       // Limitation de longueur
      ];

      testCases.forEach(({ input, expected }) => {
        const rawMessage = {
          commentId: 'test',
          userId: 'test',
          username: input,
          text: 'test comment'
        };

        // WHEN: Parsing du commentaire
        const result = TikTokCommentParser.parseAndValidateComment(rawMessage, Date.now());

        // THEN: Nom d'utilisateur nettoyé correctement
        expect(result!.username).toBe(expected);
      });
    });

    test('[P2] devrait limiter la longueur du texte des commentaires', () => {
      // GIVEN: Texte très long
      const longText = 'a'.repeat(600); // Plus de 500 caractères
      const rawMessage = {
        commentId: 'test',
        userId: 'test',
        username: 'testuser',
        text: longText
      };

      // WHEN: Parsing du commentaire
      const result = TikTokCommentParser.parseAndValidateComment(rawMessage, Date.now());

      // THEN: Texte limité à 500 caractères
      expect(result!.text.length).toBe(500);
      expect(result!.text).toBe('a'.repeat(500));
    });

    test('[P2] devrait rejeter les commentaires vides ou avec espaces seulement', () => {
      // GIVEN: Textes vides ou avec espaces
      const emptyTexts = ['', '   ', '\t\n  '];

      emptyTexts.forEach(emptyText => {
        const rawMessage = {
          commentId: 'test',
          userId: 'test',
          username: 'testuser',
          text: emptyText
        };

        // WHEN: Tentative de parsing
        const result = TikTokCommentParser.parseAndValidateComment(rawMessage, Date.now());

        // THEN: Rejeté comme invalide
        expect(result).toBeNull();
      });
    });

    test('[P2] devrait définir le timestamp correctement', () => {
      // GIVEN: Timestamp spécifique
      const receivedAt = Date.now() - 5000; // 5 secondes dans le passé
      const rawMessage = {
        commentId: 'test',
        userId: 'test',
        username: 'testuser',
        text: 'test comment'
      };

      // WHEN: Parsing du commentaire
      const result = TikTokCommentParser.parseAndValidateComment(rawMessage, receivedAt);

      // THEN: Timestamp défini correctement
      expect(result!.timestamp).toBeInstanceOf(Date);
      expect(result!.timestamp.getTime()).toBeGreaterThanOrEqual(receivedAt - 100); // Tolérance
      expect(result!.timestamp.getTime()).toBeLessThanOrEqual(Date.now());
    });
  });

  describe('validateCommentStructure', () => {
    test('[P2] devrait valider une structure de commentaire complète', () => {
      // GIVEN: Commentaire complet et valide
      const validComment: TikTokComment = {
        id: 'comment123',
        userId: 'user456',
        username: 'testuser',
        text: 'Test comment',
        timestamp: new Date(),
        sessionId: 'session123'
      };

      // WHEN: Validation de la structure
      const result = TikTokCommentParser.validateCommentStructure(validComment);

      // THEN: Retourne true
      expect(result).toBe(true);
    });

    test('[P2] devrait rejeter les commentaires avec champs manquants', () => {
      // GIVEN: Commentaires avec champs manquants
      const invalidComments = [
        { userId: 'u1', username: 'user', text: 'text', timestamp: new Date(), sessionId: 's1' }, // id manquant
        { id: 'c1', username: 'user', text: 'text', timestamp: new Date(), sessionId: 's1' },   // userId manquant
        { id: 'c1', userId: 'u1', text: 'text', timestamp: new Date(), sessionId: 's1' },       // username manquant
        { id: 'c1', userId: 'u1', username: 'user', timestamp: new Date(), sessionId: 's1' },  // text manquant
        { id: 'c1', userId: 'u1', username: 'user', text: 'text', sessionId: 's1' },           // timestamp manquant
        { id: 'c1', userId: 'u1', username: 'user', text: 'text', timestamp: new Date() },     // sessionId manquant
        { id: '', userId: 'u1', username: 'user', text: 'text', timestamp: new Date(), sessionId: 's1' }, // id vide
        { id: 'c1', userId: '', username: 'user', text: 'text', timestamp: new Date(), sessionId: 's1' }, // userId vide
        { id: 'c1', userId: 'u1', username: '', text: 'text', timestamp: new Date(), sessionId: 's1' }, // username vide
        { id: 'c1', userId: 'u1', username: 'user', text: '', timestamp: new Date(), sessionId: 's1' }, // text vide
        { id: 'c1', userId: 'u1', username: 'user', text: 'text', timestamp: 'invalid', sessionId: 's1' } // timestamp invalide
      ];

      invalidComments.forEach(invalidComment => {
        // WHEN: Validation de la structure
        const result = TikTokCommentParser.validateCommentStructure(invalidComment as TikTokComment);

        // THEN: Retourne false
        expect(result).toBe(false);
      });
    });
  });

  describe('sanitizeComment', () => {
    test('[P2] devrait masquer les informations sensibles', () => {
      // GIVEN: Commentaire avec numéro de téléphone
      const commentWithPhone: TikTokComment = {
        id: 'c1',
        userId: 'u1',
        username: 'user',
        text: 'Mon numéro est 0123456789, appelez-moi !',
        timestamp: new Date(),
        sessionId: 's1'
      };

      // WHEN: Sanitization du commentaire
      const result = TikTokCommentParser.sanitizeComment(commentWithPhone);

      // THEN: Numéro de téléphone masqué
      expect(result.text).toBe('Mon numéro est [PHONE_NUMBER], appelez-moi !');
      expect(result.text).not.toContain('0123456789');
    });

    test('[P2] devrait retourner une copie du commentaire sans modification des autres champs', () => {
      // GIVEN: Commentaire valide
      const originalComment: TikTokComment = {
        id: 'c1',
        userId: 'u1',
        username: 'user',
        text: 'Texte normal sans données sensibles',
        timestamp: new Date(),
        sessionId: 's1'
      };

      // WHEN: Sanitization
      const result = TikTokCommentParser.sanitizeComment(originalComment);

      // THEN: Autres champs inchangés
      expect(result.id).toBe(originalComment.id);
      expect(result.userId).toBe(originalComment.userId);
      expect(result.username).toBe(originalComment.username);
      expect(result.timestamp).toBe(originalComment.timestamp);
      expect(result.sessionId).toBe(originalComment.sessionId);
    });
  });

  describe('extractCommentMetadata', () => {
    test('[P2] devrait extraire les métadonnées correctement', () => {
      // GIVEN: Commentaire avec mentions et longueur spécifique
      const comment: TikTokComment = {
        id: 'c1',
        userId: 'u1',
        username: 'testuser',
        text: '@otheruser voici ma réponse ! 😊',
        timestamp: new Date(),
        sessionId: 's1'
      };

      // WHEN: Extraction des métadonnées
      const metadata = TikTokCommentParser.extractCommentMetadata(comment);

      // THEN: Métadonnées correctes
      expect(metadata.hasMentions).toBe(true);
      expect(metadata.hasEmojis).toBe(false); // TODO: Implémentation emoji
      expect(metadata.textLength).toBe(31);
      expect(metadata.usernameLength).toBe(9);
    });

    test('[P2] devrait détecter l\'absence de mentions', () => {
      // GIVEN: Commentaire sans mentions
      const comment: TikTokComment = {
        id: 'c1',
        userId: 'u1',
        username: 'testuser',
        text: 'Juste un commentaire normal',
        timestamp: new Date(),
        sessionId: 's1'
      };

      // WHEN: Extraction des métadonnées
      const metadata = TikTokCommentParser.extractCommentMetadata(comment);

      // THEN: Pas de mentions détectées
      expect(metadata.hasMentions).toBe(false);
    });
  });
});