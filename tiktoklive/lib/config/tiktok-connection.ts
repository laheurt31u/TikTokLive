/**
 * Configuration des paramètres de connexion TikTok Live
 * Définit tous les paramètres selon les spécifications architecturales
 */

import { TikTokConnectionConfig } from '../tiktok/types';

/**
 * Configuration par défaut pour les connexions TikTok
 * Basée sur les spécifications des Dev Notes
 */
export const DEFAULT_TIKTOK_CONFIG: TikTokConnectionConfig = {
  sessionId: '', // Sera défini depuis les credentials stockés
  cookies: '',   // Sera défini depuis les credentials stockés
  timeout: parseInt(process.env.CIRCUIT_BREAKER_TIMEOUT || '30000'), // 30 secondes
  retryAttempts: 3,
  retryDelay: 1000, // 1 seconde de base pour backoff exponentiel
};

/**
 * Configuration avancée pour les environnements de production
 */
export const PRODUCTION_TIKTOK_CONFIG: Partial<TikTokConnectionConfig> = {
  timeout: 45000, // 45 secondes en production
  retryAttempts: 5,
  retryDelay: 2000, // 2 secondes de base
};

/**
 * Configuration pour les tests et développement
 */
export const DEVELOPMENT_TIKTOK_CONFIG: Partial<TikTokConnectionConfig> = {
  timeout: 15000, // 15 secondes en développement
  retryAttempts: 2,
  retryDelay: 500, // 500ms de base
};

/**
 * Validation des paramètres de configuration
 */
export function validateConnectionConfig(config: Partial<TikTokConnectionConfig>): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (config.timeout !== undefined && (config.timeout < 5000 || config.timeout > 120000)) {
    errors.push('Timeout doit être entre 5000ms et 120000ms');
  }

  if (config.retryAttempts !== undefined && (config.retryAttempts < 0 || config.retryAttempts > 10)) {
    errors.push('retryAttempts doit être entre 0 et 10');
  }

  if (config.retryDelay !== undefined && (config.retryDelay < 100 || config.retryDelay > 30000)) {
    errors.push('retryDelay doit être entre 100ms et 30000ms');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Fusionne la configuration par défaut avec les paramètres personnalisés
 */
export function createConnectionConfig(
  customConfig: Partial<TikTokConnectionConfig> = {},
  environment: 'development' | 'production' | 'test' = 'development'
): TikTokConnectionConfig {
  let baseConfig = DEFAULT_TIKTOK_CONFIG;

  // Appliquer la configuration selon l'environnement
  switch (environment) {
    case 'production':
      baseConfig = { ...baseConfig, ...PRODUCTION_TIKTOK_CONFIG };
      break;
    case 'test':
    case 'development':
      baseConfig = { ...baseConfig, ...DEVELOPMENT_TIKTOK_CONFIG };
      break;
  }

  // Fusionner avec la configuration personnalisée
  const finalConfig = { ...baseConfig, ...customConfig };

  // Validation finale
  const validation = validateConnectionConfig(finalConfig);
  if (!validation.isValid) {
    throw new Error(`Configuration invalide: ${validation.errors.join(', ')}`);
  }

  return finalConfig;
}

/**
 * Calcule le délai d'attente pour une tentative de reconnexion
 * Utilise un backoff exponentiel avec jitter
 */
export function calculateRetryDelay(
  attemptNumber: number,
  baseDelay: number,
  maxDelay: number = 30000
): number {
  // Backoff exponentiel: baseDelay * (2 ^ attemptNumber)
  const exponentialDelay = baseDelay * Math.pow(2, attemptNumber);

  // Ajouter un jitter aléatoire (±25%) pour éviter les thundering herd
  const jitter = exponentialDelay * 0.25 * (Math.random() * 2 - 1);
  const delayWithJitter = exponentialDelay + jitter;

  // S'assurer que le délai ne dépasse pas le maximum
  return Math.min(delayWithJitter, maxDelay);
}

/**
 * Détermine l'environnement d'exécution
 */
export function detectEnvironment(): 'development' | 'production' | 'test' {
  if (process.env.NODE_ENV === 'production') return 'production';
  if (process.env.NODE_ENV === 'test' || process.env.JEST_WORKER_ID) return 'test';
  return 'development';
}

/**
 * Configuration de logging pour les connexions
 */
export interface ConnectionLoggingConfig {
  enableCorrelationIds: boolean;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  enableMetrics: boolean;
  enablePerformanceTracking: boolean;
}

export const DEFAULT_LOGGING_CONFIG: ConnectionLoggingConfig = {
  enableCorrelationIds: true,
  logLevel: (process.env.LOG_LEVEL as ConnectionLoggingConfig['logLevel']) ||
            (detectEnvironment() === 'production' ? 'warn' : 'debug'),
  enableMetrics: true,
  enablePerformanceTracking: true,
};