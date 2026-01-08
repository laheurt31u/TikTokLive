/**
 * API Routes pour la gestion des connexions TikTok Live
 * Implémente les endpoints REST spécifiés dans la story
 */

import { NextRequest, NextResponse } from 'next/server';
import { TikTokConnectorFactory } from '../../../lib/tiktok/connector';
import { CorrelationManager } from '../../../lib/logger/correlation';
import { z } from 'zod';

// Schema de validation pour la connexion
const connectSchema = z.object({
  sessionId: z.string().min(1, 'sessionId requis'),
  cookies: z.string().min(1, 'cookies requis'),
  timeout: z.number().optional(),
  retryAttempts: z.number().optional(),
  retryDelay: z.number().optional(),
});

// Instance globale du connecteur (singleton pattern)
let globalTikTokConnector: any = null;

/**
 * POST /api/tiktok/connect
 * Établit une connexion TikTok Live
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  return CorrelationManager.runInContext({ endpoint: 'tiktok-connect' }, async () => {
    try {
      const body = await request.json();

      // Validation des données d'entrée
      const validationResult = connectSchema.safeParse(body);
      if (!validationResult.success) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Données de connexion invalides',
              details: validationResult.error.format()
            }
          },
          { status: 400 }
        );
      }

      const { sessionId, cookies, ...configOverrides } = validationResult.data;

      // Utiliser les variables d'environnement si les credentials ne sont pas fournis
      const finalSessionId = sessionId || process.env.TIKTOK_SESSION_ID;
      const finalCookies = cookies || process.env.TIKTOK_COOKIES;

      if (!finalSessionId || !finalCookies) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'MISSING_CREDENTIALS',
              message: 'Session ID et cookies requis (via paramètres ou variables d\'environnement TIKTOK_SESSION_ID et TIKTOK_COOKIES)',
            }
          },
          { status: 400 }
        );
      }

      // Créer ou récupérer le connecteur
      if (!globalTikTokConnector) {
        globalTikTokConnector = TikTokConnectorFactory.getConnector('global-tiktok-connector');
      }

      // Initialiser la connexion
      await globalTikTokConnector.initialize(finalSessionId, finalCookies, configOverrides);

      return NextResponse.json({
        success: true,
        data: {
          status: 'connecting',
          correlationId: CorrelationManager.getCurrentId(),
          message: 'Connexion TikTok initiée'
        }
      });

    } catch (error) {
      console.error('Erreur lors de la connexion TikTok:', error);

      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'CONNECTION_ERROR',
            message: 'Échec de la connexion TikTok',
            details: error instanceof Error ? error.message : 'Erreur inconnue'
          }
        },
        { status: 500 }
      );
    }
  });
}

/**
 * GET /api/tiktok/status
 * Récupère le statut de la connexion TikTok
 */
export async function GET(): Promise<NextResponse> {
  return CorrelationManager.runInContext({ endpoint: 'tiktok-status' }, async () => {
    try {
      if (!globalTikTokConnector) {
        return NextResponse.json({
          success: true,
          data: {
            connected: false,
            status: 'disconnected',
            message: 'Aucune connexion TikTok active'
          }
        });
      }

      const status = globalTikTokConnector.getConnectionStatus();

      return NextResponse.json({
        success: true,
        data: {
          connected: status.connected,
          status: status.connected ? 'connected' : 'disconnected',
          lastConnected: status.lastConnected,
          lastError: status.lastError,
          retryCount: status.retryCount,
          correlationId: CorrelationManager.getCurrentId()
        }
      });

    } catch (error) {
      console.error('Erreur lors de la récupération du statut:', error);

      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'STATUS_ERROR',
            message: 'Erreur lors de la récupération du statut',
            details: error instanceof Error ? error.message : 'Erreur inconnue'
          }
        },
        { status: 500 }
      );
    }
  });
}

/**
 * DELETE /api/tiktok/disconnect
 * Ferme la connexion TikTok Live
 */
export async function DELETE(): Promise<NextResponse> {
  return CorrelationManager.runInContext({ endpoint: 'tiktok-disconnect' }, async () => {
    try {
      if (!globalTikTokConnector) {
        return NextResponse.json({
          success: true,
          data: {
            message: 'Aucune connexion active à fermer'
          }
        });
      }

      // Nettoyer le connecteur via la factory
      TikTokConnectorFactory.removeConnector('global-tiktok-connector');
      globalTikTokConnector = null;

      return NextResponse.json({
        success: true,
        data: {
          status: 'disconnected',
          message: 'Connexion TikTok fermée',
          correlationId: CorrelationManager.getCurrentId()
        }
      });

    } catch (error) {
      console.error('Erreur lors de la déconnexion:', error);

      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'DISCONNECT_ERROR',
            message: 'Erreur lors de la déconnexion',
            details: error instanceof Error ? error.message : 'Erreur inconnue'
          }
        },
        { status: 500 }
      );
    }
  });
}