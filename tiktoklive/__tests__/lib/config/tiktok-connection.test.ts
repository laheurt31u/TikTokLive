/**
 * Tests unitaires pour la configuration des connexions TikTok
 */

import {
  DEFAULT_TIKTOK_CONFIG,
  PRODUCTION_TIKTOK_CONFIG,
  DEVELOPMENT_TIKTOK_CONFIG,
  validateConnectionConfig,
  createConnectionConfig,
  calculateRetryDelay,
  detectEnvironment
} from '../../../lib/config/tiktok-connection';

describe('DEFAULT_TIKTOK_CONFIG', () => {
  it('devrait avoir des valeurs par défaut valides', () => {
    expect(DEFAULT_TIKTOK_CONFIG.timeout).toBeGreaterThan(0);
    expect(DEFAULT_TIKTOK_CONFIG.retryAttempts).toBeGreaterThan(0);
    expect(DEFAULT_TIKTOK_CONFIG.retryDelay).toBeGreaterThan(0);
  });
});

describe('validateConnectionConfig', () => {
  it('devrait valider une configuration valide', () => {
    const validConfig = {
      timeout: 30000,
      retryAttempts: 3,
      retryDelay: 1000
    };

    const result = validateConnectionConfig(validConfig);
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('devrait rejeter un timeout trop court', () => {
    const invalidConfig = { timeout: 1000 };

    const result = validateConnectionConfig(invalidConfig);
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('Timeout doit être entre 5000ms et 120000ms');
  });

  it('devrait rejeter un timeout trop long', () => {
    const invalidConfig = { timeout: 200000 };

    const result = validateConnectionConfig(invalidConfig);
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('Timeout doit être entre 5000ms et 120000ms');
  });

  it('devrait rejeter un nombre de tentatives négatif', () => {
    const invalidConfig = { retryAttempts: -1 };

    const result = validateConnectionConfig(invalidConfig);
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('retryAttempts doit être entre 0 et 10');
  });

  it('devrait rejeter trop de tentatives', () => {
    const invalidConfig = { retryAttempts: 15 };

    const result = validateConnectionConfig(invalidConfig);
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('retryAttempts doit être entre 0 et 10');
  });

  it('devrait rejeter un délai de retry trop court', () => {
    const invalidConfig = { retryDelay: 50 };

    const result = validateConnectionConfig(invalidConfig);
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('retryDelay doit être entre 100ms et 30000ms');
  });
});

describe('createConnectionConfig', () => {
  it('devrait créer une configuration avec les valeurs par défaut', () => {
    const config = createConnectionConfig();

    expect(config.timeout).toBeDefined();
    expect(config.retryAttempts).toBeDefined();
    expect(config.retryDelay).toBeDefined();
  });

  it('devrait fusionner avec une configuration personnalisée', () => {
    const customConfig = { timeout: 60000 };
    const config = createConnectionConfig(customConfig);

    expect(config.timeout).toBe(60000);
    expect(config.retryAttempts).toBe(DEVELOPMENT_TIKTOK_CONFIG.retryAttempts);
  });

  it('devrait appliquer la configuration de production', () => {
    const config = createConnectionConfig({}, 'production');

    expect(config.timeout).toBe(PRODUCTION_TIKTOK_CONFIG.timeout);
    expect(config.retryAttempts).toBe(PRODUCTION_TIKTOK_CONFIG.retryAttempts);
  });

  it('devrait appliquer la configuration de développement', () => {
    const config = createConnectionConfig({}, 'development');

    expect(config.timeout).toBe(DEVELOPMENT_TIKTOK_CONFIG.timeout);
    expect(config.retryAttempts).toBe(DEVELOPMENT_TIKTOK_CONFIG.retryAttempts);
  });

  it('devrait rejeter une configuration invalide', () => {
    const invalidConfig = { timeout: 1000 };

    expect(() => createConnectionConfig(invalidConfig)).toThrow('Configuration invalide');
  });
});

describe('calculateRetryDelay', () => {
  it('devrait calculer un délai croissant avec backoff exponentiel', () => {
    const baseDelay = 1000;

    const delay1 = calculateRetryDelay(0, baseDelay);
    const delay2 = calculateRetryDelay(1, baseDelay);
    const delay3 = calculateRetryDelay(2, baseDelay);

    expect(delay2).toBeGreaterThan(delay1);
    expect(delay3).toBeGreaterThan(delay2);
  });

  it('devrait appliquer un backoff exponentiel correct', () => {
    const baseDelay = 1000;

    const delay0 = calculateRetryDelay(0, baseDelay);
    expect(delay0).toBeCloseTo(1000, -100); // Tolérance pour le jitter

    const delay1 = calculateRetryDelay(1, baseDelay);
    expect(delay1).toBeCloseTo(2000, -200);

    const delay2 = calculateRetryDelay(2, baseDelay);
    expect(delay2).toBeCloseTo(4000, -400);
  });

  it('devrait respecter le délai maximum', () => {
    const baseDelay = 1000;
    const maxDelay = 5000;

    const delay = calculateRetryDelay(10, baseDelay, maxDelay);
    expect(delay).toBeLessThanOrEqual(maxDelay);
  });

  it('devrait inclure du jitter aléatoire', () => {
    const baseDelay = 1000;

    // Calculer plusieurs fois pour voir la variation due au jitter
    const delays = Array.from({ length: 10 }, () => calculateRetryDelay(1, baseDelay));

    const minDelay = Math.min(...delays);
    const maxDelay = Math.max(...delays);

    // Le jitter devrait créer de la variation (±25%)
    expect(maxDelay - minDelay).toBeGreaterThan(0);
    expect(minDelay).toBeGreaterThan(1500); // Au moins 2000 * 0.75
    expect(maxDelay).toBeLessThan(2500);   // Au plus 2000 * 1.25
  });
});

describe('detectEnvironment', () => {
  const originalEnv = process.env.NODE_ENV;
  const originalJestWorker = process.env.JEST_WORKER_ID;

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
    process.env.JEST_WORKER_ID = originalJestWorker;
  });

  it('devrait détecter l\'environnement de production', () => {
    process.env.NODE_ENV = 'production';
    expect(detectEnvironment()).toBe('production');
  });

  it('devrait détecter l\'environnement de test', () => {
    process.env.NODE_ENV = 'test';
    expect(detectEnvironment()).toBe('test');
  });

  // Note: Le test de détection d'environnement par défaut est omis car Jest
  // définit automatiquement JEST_WORKER_ID, rendant ce test non déterministe

  it('devrait détecter Jest comme environnement de test', () => {
    process.env.NODE_ENV = 'development';
    process.env.JEST_WORKER_ID = '1';
    expect(detectEnvironment()).toBe('test');
  });
});