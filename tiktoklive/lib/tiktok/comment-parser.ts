/**
 * Service de parsing des commentaires TikTok
 * Story 2.4: Parsing des Commentaires du Chat
 *
 * Responsabilités:
 * - Extraire username et texte depuis WebcastChatMessage ou TikTokComment
 * - Valider format avec schémas Zod
 * - Nettoyer emojis avec regex Unicode Property Escapes
 * - Supprimer mentions (@username)
 * - Normaliser texte (NFKD, lowercase, trim)
 * - Retourner objet structuré ParsedComment
 */

import { validateWebcastChatMessage } from '../validation/comment-schemas';

/**
 * Interface pour commentaire TikTok parsé et nettoyé
 */
export interface ParsedComment {
  username: string;           // data.user.uniqueId
  originalText: string;       // data.comment (non modifié)
  cleanedText: string;        // Texte nettoyé (lowercase, sans emojis/mentions)
  timestamp: number;          // Timestamp Unix en ms
  questionId?: string;        // ID question active (optionnel)
}

/**
 * Interface pour message TikTok brut (selon tiktok-live-connector)
 */
export interface WebcastChatMessage {
  user: {
    uniqueId: string;         // Username unique
    userId: string;           // ID utilisateur
    nickname: string;         // Nom affiché
  };
  comment: string;            // Texte du commentaire
  timestamp: number;          // Timestamp Unix
}

/**
 * Interface pour commentaire TikTok standardisé (format interne)
 */
export interface TikTokComment {
  id: string;
  userId: string;
  username: string;
  text: string;
  timestamp: Date;
  sessionId: string;
}

/**
 * Service de parsing des commentaires TikTok
 */
export class CommentParser {
  // Regex pour emojis (compilée une seule fois pour performance)
  private static readonly EMOJI_REGEX = /\p{Emoji}/ug;

  // Regex pour mentions (compilée une seule fois)
  private static readonly MENTION_REGEX = /@\w+/g;

  /**
   * Parse et nettoie un commentaire TikTok
   * Accepte deux formats:
   * - WebcastChatMessage (format brut tiktok-live-connector)
   * - TikTokComment (format standardisé interne)
   *
   * @param rawMessage - Message brut depuis tiktok-live-connector ou TikTokComment standardisé
   * @returns ParsedComment ou null si invalide/vide après nettoyage
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  static parseComment(rawMessage: any): ParsedComment | null {
    try {
      // Validation format message
      if (!rawMessage || typeof rawMessage !== 'object') {
        return null;
      }

      // Détection du format: TikTokComment (format interne) ou WebcastChatMessage (format brut)
      let username: string | undefined;
      let commentText: string | undefined;
      let timestamp: number;

      // Format TikTokComment (format standardisé interne)
      if (rawMessage.username && rawMessage.text) {
        username = rawMessage.username;
        commentText = rawMessage.text;
        // Convertir Date en timestamp Unix (ms)
        timestamp = rawMessage.timestamp instanceof Date
          ? rawMessage.timestamp.getTime()
          : typeof rawMessage.timestamp === 'number'
            ? rawMessage.timestamp
            : Date.now();
      }
      // Format WebcastChatMessage (format brut tiktok-live-connector)
      else if (rawMessage.user?.uniqueId && rawMessage.comment) {
        // Validation Zod pour format WebcastChatMessage (architecture Decision-5)
        const validation = validateWebcastChatMessage(rawMessage);
        if (!validation.success) {
          // Format invalide selon schéma Zod
          return null;
        }
        // Utiliser données validées
        username = validation.data!.user.uniqueId;
        commentText = validation.data!.comment;
        timestamp = validation.data!.timestamp;
      }
      // Format inconnu
      else {
        return null;
      }

      // Validation champs critiques
      if (!username || typeof username !== 'string' || username.trim() === '') {
        return null;
      }

      if (!commentText || typeof commentText !== 'string') {
        return null;
      }

      // Nettoyage du texte
      const cleanedText = this.cleanText(commentText);

      // Ignorer si texte vide après nettoyage
      if (cleanedText === '') {
        return null;
      }

      // Retourner objet structuré
      return {
        username: username.trim(),
        originalText: commentText,
        cleanedText,
        timestamp
      };

    } catch (error) {
      // Logging structuré avec MetricsCollector (même en production)
      // Note: Import dynamique pour éviter dépendance circulaire
      try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const { MetricsCollector } = require('../logger/metrics');
        MetricsCollector.recordError(
          error as Error,
          'medium',
          {
            operation: 'comment-parser',
            rawMessage: JSON.stringify(rawMessage).substring(0, 200)
          }
        );
      } catch {
        // Fallback si MetricsCollector non disponible (tests)
        if (process.env.NODE_ENV !== 'test') {
          console.warn('Erreur parsing commentaire TikTok:', error);
        }
      }
      return null;
    }
  }

  /**
   * Supprime les emojis du texte avec regex Unicode Property Escapes
   *
   * @param text - Texte à nettoyer
   * @returns Texte sans emojis
   */
  static removeEmojis(text: string): string {
    return text.replace(this.EMOJI_REGEX, '');
  }

  /**
   * Supprime les mentions (@username) du texte
   *
   * @param text - Texte à nettoyer
   * @returns Texte sans mentions
   */
  static removeMentions(text: string): string {
    return text.replace(this.MENTION_REGEX, '');
  }

  /**
   * Normalise le texte: NFKD + suppression accents + lowercase + trim
   * NFKD décompose les accents (é → e + ´), puis on les supprime pour matching uniforme
   *
   * @param text - Texte à normaliser
   * @returns Texte normalisé (sans accents, minuscules, trimmed)
   */
  static normalizeText(text: string): string {
    return text
      .normalize('NFKD')                        // Normalisation Unicode (décomposition)
      .replace(/[\u0300-\u036f]/g, '')          // Suppression des diacritiques (accents combinés)
      .toLowerCase()                             // Conversion minuscules
      .trim();                                   // Suppression espaces début/fin
  }

  /**
   * Pipeline complet de nettoyage: emojis → mentions → normalize
   *
   * @param text - Texte à nettoyer
   * @returns Texte nettoyé
   */
  static cleanText(text: string): string {
    return this.normalizeText(
      this.removeMentions(
        this.removeEmojis(text)
      )
    );
  }
}
