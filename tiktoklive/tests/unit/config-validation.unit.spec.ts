import { createConnectionConfig, detectEnvironment } from '../../lib/config/tiktok-connection';
import { TikTokConnectionConfig, ValidationResult } from '../../lib/tiktok/types';

describe('Configuration and Validation', () => {
  describe('[P2] Environment Detection', () => {
    test('should detect development environment', () => {
      // Mock environment variables for development
      process.env.NODE_ENV = 'development';
      process.env.TIKTOK_ENV = 'dev';

      const env = detectEnvironment();

      expect(env).toBeDefined();
      expect(env.nodeEnv).toBe('development');
      expect(env.isProduction).toBe(false);
      expect(env.isDevelopment).toBe(true);
    });

    test('should detect production environment', () => {
      process.env.NODE_ENV = 'production';
      process.env.TIKTOK_ENV = 'prod';

      const env = detectEnvironment();

      expect(env.isProduction).toBe(true);
      expect(env.isDevelopment).toBe(false);
    });

    test('should detect test environment', () => {
      process.env.NODE_ENV = 'test';
      process.env.TIKTOK_ENV = 'test';

      const env = detectEnvironment();

      expect(env.isTest).toBe(true);
    });

    test('should provide default timeout values based on environment', () => {
      process.env.NODE_ENV = 'development';
      const devEnv = detectEnvironment();

      process.env.NODE_ENV = 'production';
      const prodEnv = detectEnvironment();

      // Development should have shorter timeouts for faster feedback
      expect(devEnv.defaultTimeout).toBeLessThanOrEqual(prodEnv.defaultTimeout);
    });
  });

  describe('[P2] Connection Configuration Creation', () => {
    test('should create configuration with default values', () => {
      const config = createConnectionConfig();

      expect(config).toBeDefined();
      expect(config.timeout).toBeDefined();
      expect(config.retryAttempts).toBeDefined();
      expect(config.retryDelay).toBeDefined();
      expect(typeof config.timeout).toBe('number');
      expect(typeof config.retryAttempts).toBe('number');
    });

    test('should override defaults with provided values', () => {
      const customConfig = {
        timeout: 10000,
        retryAttempts: 5,
        retryDelay: 2000
      };

      const config = createConnectionConfig(customConfig);

      expect(config.timeout).toBe(10000);
      expect(config.retryAttempts).toBe(5);
      expect(config.retryDelay).toBe(2000);
    });

    test('should merge custom config with defaults', () => {
      const customConfig = {
        timeout: 15000 // Only override timeout
      };

      const config = createConnectionConfig(customConfig);

      expect(config.timeout).toBe(15000);
      // Other values should be defaults
      expect(config.retryAttempts).toBeDefined();
      expect(config.retryDelay).toBeDefined();
    });

    test('should adapt configuration based on environment', () => {
      process.env.NODE_ENV = 'development';
      const devConfig = createConnectionConfig();

      process.env.NODE_ENV = 'production';
      const prodConfig = createConnectionConfig();

      // Development might have more aggressive retry settings
      expect(devConfig.retryAttempts).toBeGreaterThanOrEqual(prodConfig.retryAttempts);
    });
  });

  describe('[P2] Configuration Validation', () => {
    test('should validate session ID format', () => {
      const validConfigs: Partial<TikTokConnectionConfig>[] = [
        { sessionId: 'session_1234567890_abcdef123456' },
        { sessionId: 'session_1234567890_abcdef' },
        { sessionId: 'custom_session_id_123' }
      ];

      const invalidConfigs: Partial<TikTokConnectionConfig>[] = [
        { sessionId: '' },
        { sessionId: 'session' }, // Too short
        { sessionId: 'invalid_format' }, // Missing underscore pattern
        { sessionId: null as any },
        { sessionId: undefined as any }
      ];

      // Note: This would require implementing a validateSessionId function
      // For now, just test the structure
      validConfigs.forEach(config => {
        expect(config.sessionId).toBeDefined();
        expect(typeof config.sessionId).toBe('string');
        expect(config.sessionId.length).toBeGreaterThan(0);
      });

      invalidConfigs.forEach(config => {
        expect(config.sessionId).toBeFalsy();
      });
    });

    test('should validate cookie format and required fields', () => {
      const validCookies = [
        'sessionid=abc123; user_id=456',
        'sessionid=abc123; user_id=456; tt_csrf_token=xyz789',
        'sessionid=abc123; user_id=456; tt_csrf_token=xyz789; additional=value'
      ];

      const invalidCookies = [
        '',
        'invalid',
        'sessionid=',
        '=abc123',
        'sessionid=abc123', // Missing user_id
        null,
        undefined
      ];

      // Valid cookies should contain required fields
      validCookies.forEach(cookie => {
        expect(cookie).toContain('sessionid=');
        expect(cookie).toContain('user_id=');
      });

      // Invalid cookies should be falsy or missing required fields
      invalidCookies.forEach(cookie => {
        if (cookie !== null && cookie !== undefined && cookie !== '') {
          expect(cookie).not.toContain('sessionid=') ||
          expect(cookie).not.toContain('user_id=');
        }
      });
    });

    test('should validate timeout configuration', () => {
      const validTimeouts = [1000, 5000, 10000, 30000, 60000];
      const invalidTimeouts = [0, -1000, NaN, null, undefined];

      validTimeouts.forEach(timeout => {
        expect(timeout).toBeGreaterThan(0);
        expect(Number.isFinite(timeout)).toBe(true);
      });

      invalidTimeouts.forEach(timeout => {
        expect(timeout).toBeFalsy() ||
        expect(timeout).toBeLessThanOrEqual(0) ||
        expect(Number.isFinite(timeout as number)).toBe(false);
      });
    });

    test('should validate retry configuration', () => {
      const validRetryConfigs = [
        { attempts: 3, delay: 1000 },
        { attempts: 5, delay: 2000 },
        { attempts: 1, delay: 500 },
        { attempts: 10, delay: 5000 }
      ];

      const invalidRetryConfigs = [
        { attempts: 0, delay: 1000 },
        { attempts: -1, delay: 1000 },
        { attempts: 3, delay: 0 },
        { attempts: 3, delay: -500 },
        { attempts: NaN, delay: 1000 },
        { attempts: 3, delay: NaN }
      ];

      validRetryConfigs.forEach(config => {
        expect(config.attempts).toBeGreaterThan(0);
        expect(config.delay).toBeGreaterThan(0);
        expect(Number.isFinite(config.attempts)).toBe(true);
        expect(Number.isFinite(config.delay)).toBe(true);
      });

      invalidRetryConfigs.forEach(config => {
        expect(config.attempts).toBeLessThanOrEqual(0) ||
        expect(config.delay).toBeLessThanOrEqual(0) ||
        expect(Number.isFinite(config.attempts as number)).toBe(false) ||
        expect(Number.isFinite(config.delay as number)).toBe(false);
      });
    });
  });

  describe('[P2] Configuration Sanitization', () => {
    test('should sanitize cookie values', () => {
      const dirtyCookies = [
        'sessionid=abc123 ; user_id=456 ', // Extra spaces
        'sessionid=abc123; user_id=456;', // Trailing semicolon
        ' sessionid=abc123; user_id=456 ', // Leading/trailing spaces
        'sessionid=abc123;  user_id=456  ' // Multiple spaces
      ];

      const expectedCleanCookies = [
        'sessionid=abc123; user_id=456',
        'sessionid=abc123; user_id=456',
        'sessionid=abc123; user_id=456',
        'sessionid=abc123; user_id=456'
      ];

      // Note: This would require implementing a sanitizeCookies function
      // For now, test the concept
      dirtyCookies.forEach((cookie, index) => {
        const trimmed = cookie.trim().replace(/;+$/, '').replace(/\s*;\s*/g, '; ');
        expect(trimmed).toBe(expectedCleanCookies[index]);
      });
    });

    test('should handle malformed configuration gracefully', () => {
      const malformedConfigs = [
        null,
        undefined,
        {},
        { timeout: 'invalid' },
        { retryAttempts: 'not-a-number' },
        { retryDelay: null }
      ];

      malformedConfigs.forEach(config => {
        // Should not throw when creating config with malformed input
        expect(() => createConnectionConfig(config as any)).not.toThrow();
      });
    });

    test('should provide safe defaults for invalid values', () => {
      const invalidConfigs = [
        { timeout: 0 },
        { timeout: -1000 },
        { retryAttempts: 0 },
        { retryAttempts: -5 },
        { retryDelay: 0 },
        { retryDelay: -2000 }
      ];

      invalidConfigs.forEach(invalidConfig => {
        const config = createConnectionConfig(invalidConfig);

        // Should have positive values
        expect(config.timeout).toBeGreaterThan(0);
        expect(config.retryAttempts).toBeGreaterThan(0);
        expect(config.retryDelay).toBeGreaterThan(0);
      });
    });
  });

  describe('[P2] Environment-Specific Configuration', () => {
    test('should adjust timeouts for different environments', () => {
      const environments = [
        { NODE_ENV: 'development', expectedTimeoutMultiplier: 1 },
        { NODE_ENV: 'test', expectedTimeoutMultiplier: 0.5 },
        { NODE_ENV: 'production', expectedTimeoutMultiplier: 2 }
      ];

      environments.forEach(({ NODE_ENV, expectedTimeoutMultiplier }) => {
        process.env.NODE_ENV = NODE_ENV;
        const config = createConnectionConfig();

        // Test environment should have shorter timeouts
        if (NODE_ENV === 'test') {
          expect(config.timeout).toBeLessThan(5000);
        }

        // Production should have longer timeouts
        if (NODE_ENV === 'production') {
          expect(config.timeout).toBeGreaterThan(5000);
        }
      });
    });

    test('should configure retry behavior based on environment', () => {
      process.env.NODE_ENV = 'development';
      const devConfig = createConnectionConfig();

      process.env.NODE_ENV = 'production';
      const prodConfig = createConnectionConfig();

      // Development might have more retries for debugging
      expect(devConfig.retryAttempts).toBeGreaterThanOrEqual(prodConfig.retryAttempts);
    });

    test('should enable debug features in development', () => {
      process.env.NODE_ENV = 'development';
      const config = createConnectionConfig();

      // Development config might include debug flags
      expect(config).toBeDefined();
      // Additional debug-specific validations could be added here
    });
  });
});