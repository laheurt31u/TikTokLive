/**
 * API Routes pour la gestion des questions
 * GET /api/questions - Récupère toutes les questions avec filtrage et pagination optionnels
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { loadQuestionsFromFile, getQuestionsByDifficulty, getQuestions } from '@/lib/gamification/questions';
import { CorrelationManager } from '@/lib/logger/correlation';

// Schéma de validation pour les query parameters
const queryParamsSchema = z.object({
  difficulty: z.enum(['facile', 'moyen', 'difficile']).optional(),
  limit: z.string().regex(/^\d+$/).transform(Number).optional(),
  offset: z.string().regex(/^\d+$/).transform(Number).optional(),
});

/**
 * GET /api/questions
 * Récupère les questions avec filtrage et pagination optionnels
 * 
 * Query parameters:
 * - difficulty: 'facile' | 'moyen' | 'difficile' (optionnel)
 * - limit: nombre (optionnel, pour pagination)
 * - offset: nombre (optionnel, pour pagination)
 * 
 * Response format: { success: boolean, data: Question[], meta?: object }
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  // Générer un correlation ID pour cette requête (standardisé avec CorrelationManager)
  const correlationId = CorrelationManager.generateId();
  const startTime = Date.now();

  try {
    // Parser et valider les query parameters
    const { searchParams } = new URL(request.url);
    const queryParams: Record<string, string | undefined> = {};
    
    if (searchParams.has('difficulty')) {
      queryParams.difficulty = searchParams.get('difficulty') || undefined;
    }
    if (searchParams.has('limit')) {
      queryParams.limit = searchParams.get('limit') || undefined;
    }
    if (searchParams.has('offset')) {
      queryParams.offset = searchParams.get('offset') || undefined;
    }

    const validationResult = queryParamsSchema.safeParse(queryParams);
    if (!validationResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Paramètres de requête invalides',
            details: validationResult.error.format()
          }
        },
        { status: 400 }
      );
    }

    const { difficulty, limit, offset } = validationResult.data;

    // Charger les questions
    const loadResult = await loadQuestionsFromFile();
    if (!loadResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: loadResult.error
        },
        { status: 500 }
      );
    }

    // Filtrer par difficulté si spécifié
    let questions = difficulty 
      ? getQuestionsByDifficulty(difficulty)
      : getQuestions();

    const total = questions.length;
    const filtered = questions.length;

    // Appliquer la pagination si spécifiée
    let paginatedQuestions = questions;
    let meta: Record<string, unknown> = {
      total,
      filtered
    };

    if (limit !== undefined || offset !== undefined) {
      const startIndex = offset || 0;
      const endIndex = limit !== undefined ? startIndex + limit : undefined;
      paginatedQuestions = questions.slice(startIndex, endIndex);

      meta = {
        ...meta,
        limit: limit || questions.length,
        offset: startIndex,
        hasMore: endIndex !== undefined && endIndex < questions.length
      };
    }

    // Logger la requête réussie avec métriques
    const duration = Date.now() - startTime;
    if (typeof console !== 'undefined' && console.info) {
      console.info('[API Questions] Requête réussie', {
        correlationId,
        method: 'GET',
        difficulty: difficulty || 'all',
        total: meta.total,
        filtered: meta.filtered,
        returned: paginatedQuestions.length,
        duration: `${duration}ms`
      });
    }

    return NextResponse.json(
      {
        success: true,
        data: paginatedQuestions,
        meta: {
          ...meta,
          correlationId
        }
      },
      { status: 200 }
    );
  } catch (error) {
    const duration = Date.now() - startTime;
    // Logger l'erreur avec correlation ID
    if (typeof console !== 'undefined' && console.error) {
      console.error('[API Questions] Erreur interne', {
        correlationId,
        method: 'GET',
        error: error instanceof Error ? error.message : String(error),
        duration: `${duration}ms`
      });
    }

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Erreur interne du serveur',
          details: error instanceof Error ? error.message : String(error),
          correlationId
        }
      },
      { status: 500 }
    );
  }
}
