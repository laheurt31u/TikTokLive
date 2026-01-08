/**
 * Tests unitaires pour les utilitaires overlay
 */

import {
  detectOBSResolution,
  getOptimalFontSize,
  getOptimalSpacing,
  PerformanceMonitor,
  obsBrowserConfig
} from '@/lib/overlay-utils';

describe('Overlay Utils', () => {
  describe('detectOBSResolution', () => {
    beforeEach(() => {
      // Mock window.innerWidth et innerHeight
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        value: 1920
      });
      Object.defineProperty(window, 'innerHeight', {
        writable: true,
        value: 1080
      });
    });

    it('should detect 1080p resolution', () => {
      const resolution = detectOBSResolution();

      expect(resolution.width).toBe(1920);
      expect(resolution.height).toBe(1080);
      expect(resolution.name).toBe('1080p');
      expect(resolution.aspectRatio).toBe(1920 / 1080);
      expect(resolution.isPortrait).toBe(false);
    });

    it('should detect 720p resolution', () => {
      Object.defineProperty(window, 'innerHeight', { value: 720 });

      const resolution = detectOBSResolution();

      expect(resolution.name).toBe('720p');
    });

    it('should detect 4K resolution', () => {
      Object.defineProperty(window, 'innerHeight', { value: 2160 });

      const resolution = detectOBSResolution();

      expect(resolution.name).toBe('4K');
    });

    it('should detect portrait orientation', () => {
      Object.defineProperty(window, 'innerWidth', { value: 1080 });
      Object.defineProperty(window, 'innerHeight', { value: 1920 });

      const resolution = detectOBSResolution();

      expect(resolution.isPortrait).toBe(true);
    });

    it('should handle unknown resolution', () => {
      Object.defineProperty(window, 'innerHeight', { value: 900 });

      const resolution = detectOBSResolution();

      expect(resolution.name).toBe('unknown');
    });
  });

  describe('getOptimalFontSize', () => {
    const mockResolution = {
      width: 1920,
      height: 1080,
      name: '1080p' as const,
      aspectRatio: 16/9,
      isPortrait: false
    };

    it('should scale font size based on resolution', () => {
      const baseSize = 16;

      expect(getOptimalFontSize(baseSize, { ...mockResolution, name: '720p' })).toBe(13); // 0.8 * 16
      expect(getOptimalFontSize(baseSize, mockResolution)).toBe(16); // 1.0 * 16
      expect(getOptimalFontSize(baseSize, { ...mockResolution, name: '4K' })).toBe(22); // 1.4 * 16
    });
  });

  describe('getOptimalSpacing', () => {
    const mockResolution = {
      width: 1920,
      height: 1080,
      name: '1080p' as const,
      aspectRatio: 16/9,
      isPortrait: false
    };

    it('should scale spacing based on resolution', () => {
      const baseSpacing = 20;

      expect(getOptimalSpacing(baseSpacing, { ...mockResolution, name: '720p' })).toBe(18); // 0.9 * 20
      expect(getOptimalSpacing(baseSpacing, mockResolution)).toBe(20); // 1.0 * 20
      expect(getOptimalSpacing(baseSpacing, { ...mockResolution, name: '1440p' })).toBe(22); // 1.1 * 20
    });
  });

  describe('PerformanceMonitor', () => {
    let monitor: PerformanceMonitor;
    let mockCallback: jest.Mock;

    beforeEach(() => {
      monitor = new PerformanceMonitor();
      mockCallback = jest.fn();
    });

    it('should initialize with zero metrics', () => {
      expect(monitor).toBeDefined();
    });

    it('should track frame drops', (done) => {
      monitor.start((metrics) => {
        expect(metrics.frameDrops).toBeGreaterThanOrEqual(0);
        expect(typeof metrics.averageFrameTime).toBe('number');
        monitor.stop();
        done();
      });

      // Simuler quelques frames
      setTimeout(() => {
        // Mock requestAnimationFrame n'est pas nécessaire pour ce test basique
      }, 100);
    });

    it('should stop monitoring when requested', () => {
      monitor.start(mockCallback);
      monitor.stop();

      expect(mockCallback).not.toHaveBeenCalled();
    });
  });

  describe('obsBrowserConfig', () => {
    it('should have recommended configuration', () => {
      expect(obsBrowserConfig.recommended.width).toBe(1920);
      expect(obsBrowserConfig.recommended.height).toBe(1080);
      expect(obsBrowserConfig.recommended.fps).toBe(60);
    });

    it('should have performance settings', () => {
      expect(obsBrowserConfig.performance).toHaveProperty('disableHardwareAcceleration');
      expect(obsBrowserConfig.performance).toHaveProperty('gpuIndex');
    });
  });

  describe('Server-side rendering safety', () => {
    const originalWindow = global.window;

    beforeEach(() => {
      // Supprimer window pour simuler SSR
      delete (global as any).window;
    });

    afterEach(() => {
      // Restaurer window
      global.window = originalWindow;
    });

    it('should handle server-side rendering gracefully', () => {
      const resolution = detectOBSResolution();

      expect(resolution.width).toBe(1920); // Valeur par défaut
      expect(resolution.height).toBe(1080); // Valeur par défaut
      expect(resolution.name).toBe('1080p');
    });
  });
});