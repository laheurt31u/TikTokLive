/**
 * Service de chargement et gestion des questions
 */

import { readFile } from 'fs/promises';
import { join } from 'path';
import { QuestionsFileSchema } from './schemas';
import { Question } from '@/types/gamification';
import { DEFAULT_QUESTIONS } from './default-questions';

// Cache en mémoire pour éviter les rechargements multiples
let cachedQuestions: Question[] | null = null;
let cacheTimestamp: number | null = null;
let cachedFilePath: string | null = null;

// Configuration par défaut
const DEFAULT_QUESTIONS_PATH = join(process.cwd(), 'data', 'questions.json');
const CACHE_TTL_MS = 3600 * 1000; // 1 heure en millisecondes

/**
 * Résultat de chargement avec gestion d'erreurs
 */
export interface LoadResult {
  success: boolean;
  data?: Question[];
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
}

/**
 * Charge les questions depuis un fichier JSON
 * @param filePath Chemin vers le fichier JSON (optionnel, utilise QUESTIONS_FILE_PATH ou défaut)
 * @returns Résultat du chargement avec données ou erreur
 */
export async function loadQuestionsFromFile(
  filePath?: string
): Promise<LoadResult> {
  try {
    // Déterminer le chemin du fichier
    const questionsPath = filePath || 
      process.env.QUESTIONS_FILE_PATH || 
      DEFAULT_QUESTIONS_PATH;

    // Valider le chemin du fichier (seulement si fourni explicitement, pas pour valeurs par défaut)
    if (filePath !== undefined && (!filePath || typeof filePath !== 'string' || filePath.trim() === '')) {
      const fallbackEnabled = process.env.QUESTIONS_FALLBACK_ENABLED !== 'false';
      if (fallbackEnabled) {
        return handleFallbackMode('INVALID_PATH', 'Chemin de fichier invalide');
      }
      return {
        success: false,
        error: {
          code: 'INVALID_PATH',
          message: 'Chemin de fichier invalide',
          details: `Le chemin fourni est invalide: ${questionsPath}`
        }
      };
    }

    // Utiliser le cache si disponible et valide (seulement si même chemin)
    if (cachedQuestions !== null && cacheTimestamp !== null && cachedFilePath === questionsPath) {
      const now = Date.now();
      if (now - cacheTimestamp < CACHE_TTL_MS) {
        return {
          success: true,
          data: cachedQuestions
        };
      }
      // Cache expiré, le vider
      cachedQuestions = null;
      cacheTimestamp = null;
      cachedFilePath = null;
    }

    // Lire le fichier
    const fileContent = await readFile(questionsPath, 'utf-8');

    // Parser le JSON
    let jsonData: unknown;
    try {
      jsonData = JSON.parse(fileContent);
    } catch (parseError) {
      // Mode fallback : utiliser les questions par défaut si parsing échoue
      const fallbackEnabled = process.env.QUESTIONS_FALLBACK_ENABLED !== 'false';
      if (fallbackEnabled) {
        return handleFallbackMode(
          'JSON_PARSE_ERROR',
          'Erreur de parsing JSON',
          parseError instanceof Error ? parseError.message : String(parseError)
        );
      }
      return {
        success: false,
        error: {
          code: 'JSON_PARSE_ERROR',
          message: 'Erreur de parsing JSON',
          details: parseError instanceof Error ? parseError.message : String(parseError)
        }
      };
    }

    // Valider avec Zod
    const validationResult = QuestionsFileSchema.safeParse(jsonData);
    if (!validationResult.success) {
      // Mode fallback : utiliser les questions par défaut si validation échoue
      const fallbackEnabled = process.env.QUESTIONS_FALLBACK_ENABLED !== 'false';
      if (fallbackEnabled) {
        return handleFallbackMode(
          'VALIDATION_ERROR',
          'Structure JSON invalide',
          JSON.stringify(validationResult.error.format())
        );
      }
      // Logger l'erreur de validation avec détails
      if (typeof console !== 'undefined' && console.error) {
        console.error('[Questions Service] Erreur de validation JSON:', {
          code: 'VALIDATION_ERROR',
          message: 'Structure JSON invalide',
          details: validationResult.error.format(),
          path: questionsPath
        });
      }

      return {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Structure JSON invalide',
          details: validationResult.error.format()
        }
      };
    }

    // Mettre en cache
    cachedQuestions = validationResult.data.questions;
    cacheTimestamp = Date.now();
    cachedFilePath = questionsPath;

    // Logger le chargement réussi avec métriques
    const difficultyDistribution = cachedQuestions.reduce((acc, q) => {
      acc[q.difficulty] = (acc[q.difficulty] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    if (typeof console !== 'undefined' && console.info) {
      console.info('[Questions Service] Questions chargées avec succès', {
        total: cachedQuestions.length,
        difficultyDistribution,
        source: 'file',
        path: questionsPath
      });
    }

    return {
      success: true,
      data: cachedQuestions
    };
  } catch (error) {
    // Gérer les erreurs de lecture de fichier
    if (error instanceof Error) {
      if (error.message.includes('ENOENT')) {
        // Mode fallback : utiliser les questions par défaut
        return handleFallbackMode('FILE_NOT_FOUND', 'Fichier de questions introuvable');
      }
      // Autres erreurs : essayer le mode fallback si activé
      const fallbackEnabled = process.env.QUESTIONS_FALLBACK_ENABLED !== 'false';
      if (fallbackEnabled) {
        return handleFallbackMode('LOAD_ERROR', 'Erreur lors du chargement du fichier', error.message);
      }
      return {
        success: false,
        error: {
          code: 'LOAD_ERROR',
          message: 'Erreur lors du chargement du fichier',
          details: error.message
        }
      };
    }
    // Erreur inconnue : essayer le mode fallback
    const fallbackEnabled = process.env.QUESTIONS_FALLBACK_ENABLED !== 'false';
    if (fallbackEnabled) {
      return handleFallbackMode('UNKNOWN_ERROR', 'Erreur inconnue lors du chargement', String(error));
    }
    return {
      success: false,
      error: {
        code: 'UNKNOWN_ERROR',
        message: 'Erreur inconnue lors du chargement',
        details: String(error)
      }
    };
  }
}

/**
 * Gère le mode fallback en utilisant les questions par défaut
 */
function handleFallbackMode(
  originalCode: string,
  originalMessage: string,
  details?: string
): LoadResult {
  // Vérifier si le fallback est désactivé manuellement
  if (process.env.QUESTIONS_FALLBACK_ENABLED === 'false') {
    return {
      success: false,
      error: {
        code: originalCode,
        message: originalMessage,
        details
      }
    };
  }

  // Logger l'utilisation du mode fallback
  if (typeof console !== 'undefined' && console.warn) {
    const difficultyDistribution = DEFAULT_QUESTIONS.reduce((acc, q) => {
      acc[q.difficulty] = (acc[q.difficulty] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    console.warn('[Questions Service] Mode fallback activé:', {
      reason: originalCode,
      message: originalMessage,
      questionsCount: DEFAULT_QUESTIONS.length,
      difficultyDistribution,
      details
    });
  }

  // Mettre en cache les questions par défaut
  cachedQuestions = [...DEFAULT_QUESTIONS];
  cacheTimestamp = Date.now();
  cachedFilePath = null; // Pas de fichier source pour le fallback

  return {
    success: true,
    data: cachedQuestions
  };
}

/**
 * Récupère toutes les questions chargées en mémoire
 * @returns Tableau de questions (vide si aucune question chargée)
 */
export function getQuestions(): Question[] {
  return cachedQuestions ? [...cachedQuestions] : [];
}

/**
 * Récupère les questions filtrées par difficulté
 * @param difficulty Niveau de difficulté
 * @returns Tableau de questions filtrées
 */
export function getQuestionsByDifficulty(difficulty: 'facile' | 'moyen' | 'difficile'): Question[] {
  if (!cachedQuestions) {
    return [];
  }
  return cachedQuestions.filter(q => q.difficulty === difficulty);
}

/**
 * Vide le cache des questions (utile pour les tests)
 */
export function clearCache(): void {
  cachedQuestions = null;
  cacheTimestamp = null;
  cachedFilePath = null;
}
