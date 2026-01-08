/**
 * Parser et validateur pour les données TikTok - séparation des responsabilités
 * Implémente la validation et le nettoyage des données de commentaires
 */

import { TikTokComment } from './types';

/**
 * Validateur et parser pour les commentaires TikTok
 */
export class TikTokCommentParser {
  private static readonly MAX_USERNAME_LENGTH = 50;
  private static readonly MAX_COMMENT_LENGTH = 500;

  /**
   * Parse et valide les données de commentaire TikTok
   */
  static parseAndValidateComment(rawMessage: any, receivedAt: number): TikTokComment | null {
    try {
      // Validation basique de la structure du message
      if (!rawMessage || typeof rawMessage !== 'object') {
        throw new Error('Message de commentaire invalide - structure manquante');
      }

      // Extraction et validation des champs requis
      const commentId = rawMessage.commentId || rawMessage.id;
      const userId = rawMessage.userId || rawMessage.sender?.userId;
      const username = rawMessage.username || rawMessage.sender?.username || rawMessage.sender?.name;
      const text = rawMessage.text || rawMessage.content || rawMessage.message;

      // Validation des champs critiques
      if (!commentId || typeof commentId !== 'string' || commentId.trim() === '') {
        throw new Error('ID de commentaire manquant ou invalide');
      }

      if (!userId || typeof userId !== 'string' || userId.trim() === '') {
        throw new Error('ID utilisateur manquant ou invalide');
      }

      if (!username || typeof username !== 'string' || username.trim() === '') {
        throw new Error('Nom d\'utilisateur manquant ou invalide');
      }

      if (!text || typeof text !== 'string') {
        throw new Error('Texte de commentaire manquant ou invalide');
      }

      // Nettoyage et sanitization du texte
      const cleanText = text.trim();
      if (cleanText === '') {
        throw new Error('Texte de commentaire vide après nettoyage');
      }

      // Nettoyage du nom d'utilisateur (suppression des emojis, etc.)
      const cleanUsername = username.trim()
        .replace(/[^\w\s@._-]/g, '') // Supprimer les caractères spéciaux sauf @._-
        .substring(0, this.MAX_USERNAME_LENGTH);

      // Validation finale du nom d'utilisateur nettoyé
      if (cleanUsername === '') {
        throw new Error('Nom d\'utilisateur vide après nettoyage');
      }

      // Construction de l'objet commentaire standardisé
      const comment: TikTokComment = {
        id: commentId.trim(),
        userId: userId.trim(),
        username: cleanUsername,
        text: cleanText.substring(0, this.MAX_COMMENT_LENGTH), // Limitation de longueur
        timestamp: new Date(),
        sessionId: 'unknown-session' // Sera remplacé par le vrai sessionId
      };

      return comment;

    } catch (error) {
      // Log de l'erreur de parsing sans interrompre le flux
      // Note: En production, ceci serait loggé avec un logger structuré
      // Pour les tests, on évite le bruit console
      if (process.env.NODE_ENV !== 'test') {
        console.warn('Erreur de parsing du commentaire TikTok:', {
          error: (error as Error).message,
          rawMessage: JSON.stringify(rawMessage).substring(0, 200)
        });
      }

      return null;
    }
  }

  /**
   * Valide la structure d'un commentaire déjà parsé
   */
  static validateCommentStructure(comment: TikTokComment): boolean {
    return !!(
      comment &&
      typeof comment.id === 'string' &&
      typeof comment.userId === 'string' &&
      typeof comment.username === 'string' &&
      typeof comment.text === 'string' &&
      comment.timestamp instanceof Date &&
      typeof comment.sessionId === 'string' &&
      comment.id.trim() !== '' &&
      comment.userId.trim() !== '' &&
      comment.username.trim() !== '' &&
      comment.text.trim() !== ''
    );
  }

  /**
   * Nettoie un commentaire pour supprimer les données sensibles
   */
  static sanitizeComment(comment: TikTokComment): TikTokComment {
    return {
      ...comment,
      // Supprimer ou masquer les données potentiellement sensibles
      text: comment.text.replace(/\b\d{10,}\b/g, '[PHONE_NUMBER]'), // Masquer les numéros de téléphone
    };
  }

  /**
   * Extrait des métadonnées du commentaire pour les métriques
   */
  static extractCommentMetadata(comment: TikTokComment): {
    hasMentions: boolean;
    hasEmojis: boolean;
    textLength: number;
    usernameLength: number;
  } {
    const hasMentions = /@\w+/.test(comment.text);
    const hasEmojis = false; // TODO: Implement emoji detection

    return {
      hasMentions,
      hasEmojis,
      textLength: comment.text.length,
      usernameLength: comment.username.length
    };
  }
}