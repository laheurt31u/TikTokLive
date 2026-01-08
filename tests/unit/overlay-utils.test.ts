/**
 * Tests unitaires P2 - Utilitaires Overlay
 * Tests des fonctions utilitaires pour l'overlay OBS
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import {
  detectOBSResolution,
  getOptimalFontSize,
  getOptimalSpacing,
} from '@/lib/overlay-utils';

describe('Overlay Utils', () => {
  describe('detectOBSResolution', () => {
    it('[P2] devrait détecter la résolution 720p', () => {
      // GIVEN: Window avec hauteur 720px
      Object.defineProperty(window, 'innerHeight', {
        writable: true,
        configurable: true,
        value: 720,
      });
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 1280,
      });

      // WHEN: Détectant la résolution
      const resolution = detectOBSResolution();

      // THEN: La résolution est identifiée comme 720p
      expect(resolution.name).toBe('720p');
      expect(resolution.height).toBe(720);
      expect(resolution.width).toBe(1280);
    });

    it('[P2] devrait détecter la résolution 1080p', () => {
      // GIVEN: Window avec hauteur 1080px
      Object.defineProperty(window, 'innerHeight', {
        writable: true,
        configurable: true,
        value: 1080,
      });
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 1920,
      });

      // WHEN: Détectant la résolution
      const resolution = detectOBSResolution();

      // THEN: La résolution est identifiée comme 1080p
      expect(resolution.name).toBe('1080p');
      expect(resolution.height).toBe(1080);
      expect(resolution.width).toBe(1920);
    });

    it('[P2] devrait retourner une résolution par défaut si window est undefined', () => {
      // GIVEN: Window est undefined (environnement Node.js)
      const originalWindow = global.window;
      // @ts-ignore
      delete global.window;

      // WHEN: Détectant la résolution
      const resolution = detectOBSResolution();

      // THEN: Une résolution par défaut est retournée
      expect(resolution.name).toBe('1080p');
      expect(resolution.height).toBe(1080);
      expect(resolution.width).toBe(1920);

      // Restore
      global.window = originalWindow;
    });
  });

  describe('getOptimalFontSize', () => {
    it('[P2] devrait calculer la taille de police optimale pour 720p', () => {
      // GIVEN: Résolution 720p et taille de base
      const resolution = {
        width: 1280,
        height: 720,
        name: '720p' as const,
        aspectRatio: 16/9,
        isPortrait: false,
      };
      const baseSize = 16;

      // WHEN: Calculant la taille optimale
      const optimalSize = getOptimalFontSize(baseSize, resolution);

      // THEN: La taille est ajustée avec le facteur 720p (0.8)
      expect(optimalSize).toBe(Math.round(16 * 0.8)); // 13
    });

    it('[P2] devrait calculer la taille de police optimale pour 1080p', () => {
      // GIVEN: Résolution 1080p et taille de base
      const resolution = {
        width: 1920,
        height: 1080,
        name: '1080p' as const,
        aspectRatio: 16/9,
        isPortrait: false,
      };
      const baseSize = 16;

      // WHEN: Calculant la taille optimale
      const optimalSize = getOptimalFontSize(baseSize, resolution);

      // THEN: La taille est ajustée avec le facteur 1080p (1.0)
      expect(optimalSize).toBe(16);
    });
  });

  describe('getOptimalSpacing', () => {
    it('[P2] devrait calculer l\'espacement optimal pour différentes résolutions', () => {
      // GIVEN: Différentes résolutions et espacement de base
      const baseSpacing = 10;

      const resolution720p = {
        width: 1280,
        height: 720,
        name: '720p' as const,
        aspectRatio: 16/9,
        isPortrait: false,
      };

      const resolution1080p = {
        width: 1920,
        height: 1080,
        name: '1080p' as const,
        aspectRatio: 16/9,
        isPortrait: false,
      };

      // WHEN: Calculant l'espacement optimal
      const spacing720p = getOptimalSpacing(baseSpacing, resolution720p);
      const spacing1080p = getOptimalSpacing(baseSpacing, resolution1080p);

      // THEN: Les espacements sont ajustés selon les facteurs
      expect(spacing720p).toBe(Math.round(10 * 0.9)); // 9
      expect(spacing1080p).toBe(10);
    });
  });
});
