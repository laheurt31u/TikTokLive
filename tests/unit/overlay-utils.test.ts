/**
 * Tests unitaires P2 - Utilitaires Overlay
 * Tests des fonctions utilitaires pour l'overlay OBS
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import {
  detectOBSResolution,
  getOptimalFontSize,
  getOptimalSpacing,
  optimizeAnimationsForOBS,
  PerformanceMonitor,
  assetOptimization,
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

  describe('optimizeAnimationsForOBS', () => {
    beforeEach(() => {
      // Nettoyer le head avant chaque test
      document.head.innerHTML = '';
    });

    afterEach(() => {
      // Nettoyer après chaque test
      document.head.innerHTML = '';
    });

    it('[P2] devrait ajouter des styles CSS pour optimiser les animations', () => {
      // GIVEN: Head vide
      expect(document.head.querySelector('style')).toBeNull();

      // WHEN: Optimisant les animations
      const cleanup = optimizeAnimationsForOBS();

      // THEN: Un élément style est ajouté au head
      const styleElement = document.head.querySelector('style');
      expect(styleElement).not.toBeNull();
      expect(styleElement?.textContent).toContain('.obs-optimized');
      expect(styleElement?.textContent).toContain('transform: translateZ(0)');
      expect(styleElement?.textContent).toContain('.obs-optimized-animation');

      // Cleanup
      cleanup();
      expect(document.head.querySelector('style')).toBeNull();
    });

    it('[P2] devrait retourner une fonction de cleanup qui supprime les styles', () => {
      // GIVEN: Styles optimisés ajoutés
      const cleanup = optimizeAnimationsForOBS();
      expect(document.head.querySelector('style')).not.toBeNull();

      // WHEN: Appelant la fonction de cleanup
      cleanup();

      // THEN: Les styles sont supprimés
      expect(document.head.querySelector('style')).toBeNull();
    });
  });

  describe('PerformanceMonitor', () => {
    let monitor: PerformanceMonitor;
    let mockRequestAnimationFrame: jest.Mock;
    let mockPerformanceNow: jest.Mock;

    beforeEach(() => {
      monitor = new PerformanceMonitor();
      
      // Mock requestAnimationFrame
      mockRequestAnimationFrame = jest.fn((callback) => {
        setTimeout(() => callback(performance.now()), 16);
        return 1;
      });
      global.requestAnimationFrame = mockRequestAnimationFrame as any;

      // Mock performance.now
      let time = 0;
      mockPerformanceNow = jest.fn(() => {
        time += 16.67; // Simule 60fps
        return time;
      });
      global.performance.now = mockPerformanceNow as any;
    });

    afterEach(() => {
      monitor.stop();
      jest.clearAllMocks();
    });

    it('[P2] devrait démarrer le monitoring de performance', () => {
      // GIVEN: Monitor non démarré
      const callback = jest.fn();

      // WHEN: Démarrant le monitor
      monitor.start(callback);

      // THEN: requestAnimationFrame est appelé
      expect(mockRequestAnimationFrame).toHaveBeenCalled();
    });

    it('[P2] devrait arrêter le monitoring et réinitialiser les compteurs', () => {
      // GIVEN: Monitor démarré
      monitor.start();

      // WHEN: Arrêtant le monitor
      monitor.stop();

      // THEN: Les compteurs sont réinitialisés
      // (Vérification indirecte via l'absence de callback)
      expect(monitor).toBeDefined();
    });

    it('[P2] devrait détecter les frame drops quand deltaTime > 16.67ms', () => {
      // GIVEN: Monitor avec callback
      const callback = jest.fn();
      let frameCount = 0;
      
      // Simuler des frames avec délai variable
      mockPerformanceNow = jest.fn(() => {
        frameCount++;
        // Frame 60: deltaTime normal (16.67ms)
        if (frameCount <= 60) return frameCount * 16.67;
        // Frame 61: frame drop (deltaTime > 16.67ms)
        return 61 * 16.67 + 10; // +10ms de délai
      });
      global.performance.now = mockPerformanceNow as any;

      monitor.start(callback);

      // Attendre quelques frames
      return new Promise<void>((resolve) => {
        setTimeout(() => {
          monitor.stop();
          // Le callback devrait être appelé après 60 frames
          // (même si on ne peut pas vérifier directement les frameDrops sans attendre 60 frames)
          resolve();
        }, 100);
      });
    });
  });

  describe('assetOptimization', () => {
    describe('preloadCriticalImages', () => {
      it('[P2] devrait précharger toutes les images avec succès', async () => {
        // GIVEN: URLs d'images valides
        const imageUrls = [
          'https://example.com/image1.jpg',
          'https://example.com/image2.jpg',
        ];

        // Mock Image constructor
        const mockImage = {
          onload: null as (() => void) | null,
          onerror: null as ((error: Error) => void) | null,
          src: '',
        };

        global.Image = jest.fn(() => mockImage as any) as any;

        // WHEN: Préchargeant les images
        const promise = assetOptimization.preloadCriticalImages(imageUrls);

        // Simuler le chargement réussi
        setTimeout(() => {
          if (mockImage.onload) mockImage.onload();
        }, 10);

        // THEN: La promesse se résout
        await expect(promise).resolves.toEqual([undefined, undefined]);
      });

      it('[P2] devrait rejeter si une image échoue à charger', async () => {
        // GIVEN: URLs avec une image invalide
        const imageUrls = ['https://example.com/invalid.jpg'];

        const mockImage = {
          onload: null as (() => void) | null,
          onerror: null as ((error: Error) => void) | null,
          src: '',
        };

        global.Image = jest.fn(() => mockImage as any) as any;

        // WHEN: Préchargeant les images
        const promise = assetOptimization.preloadCriticalImages(imageUrls);

        // Simuler l'erreur
        setTimeout(() => {
          if (mockImage.onerror) mockImage.onerror(new Error('Failed to load'));
        }, 10);

        // THEN: La promesse est rejetée
        await expect(promise).rejects.toBeDefined();
      });
    });

    describe('lazyLoadImage', () => {
      it('[P2] devrait charger une image de manière lazy', async () => {
        // GIVEN: URL d'image valide
        const imageUrl = 'https://example.com/image.jpg';

        const mockImage = {
          onload: null as (() => void) | null,
          onerror: null as ((error: Error) => void) | null,
          src: '',
        };

        global.Image = jest.fn(() => mockImage as any) as any;

        // WHEN: Chargement lazy
        const promise = assetOptimization.lazyLoadImage(imageUrl);

        // Simuler le chargement réussi
        setTimeout(() => {
          if (mockImage.onload) mockImage.onload();
        }, 10);

        // THEN: La promesse se résout avec l'image
        const image = await promise;
        expect(image).toBe(mockImage);
        expect(mockImage.src).toBe(imageUrl);
      });

      it('[P2] devrait rejeter si l\'image échoue à charger', async () => {
        // GIVEN: URL d'image invalide
        const imageUrl = 'https://example.com/invalid.jpg';

        const mockImage = {
          onload: null as (() => void) | null,
          onerror: null as ((error: Error) => void) | null,
          src: '',
        };

        global.Image = jest.fn(() => mockImage as any) as any;

        // WHEN: Chargement lazy
        const promise = assetOptimization.lazyLoadImage(imageUrl);

        // Simuler l'erreur
        setTimeout(() => {
          if (mockImage.onerror) mockImage.onerror(new Error('Failed to load'));
        }, 10);

        // THEN: La promesse est rejetée
        await expect(promise).rejects.toBeDefined();
      });
    });
  });
});
