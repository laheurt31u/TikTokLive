import {
  detectOBSResolution,
  getAdaptiveFontSize,
  getAdaptiveSpacing,
  getOptimizedAnimationDuration,
  COMMON_OBS_RESOLUTIONS
} from '../../lib/overlay-utils';

describe('Overlay Utils', () => {
  describe('detectOBSResolution', () => {
    it('should return 1080p as default for server-side rendering', () => {
      // Mock server-side environment
      const originalWindow = global.window;
      delete (global as any).window;

      const resolution = detectOBSResolution();

      expect(resolution).toEqual(COMMON_OBS_RESOLUTIONS[0]);
      expect(resolution.name).toBe('1080p');

      // Restore window
      global.window = originalWindow;
    });

    it('should detect resolution closest to window dimensions', () => {
      // Mock window dimensions for 4K
      const mockWindow = {
        innerWidth: 3840,
        innerHeight: 2160,
      };
      global.window = mockWindow as any;

      const resolution = detectOBSResolution();

      expect(resolution.name).toBe('4K');
      expect(resolution.width).toBe(3840);
      expect(resolution.height).toBe(2160);
    });

    it('should handle custom resolutions by finding closest match', () => {
      // Mock unusual resolution
      const mockWindow = {
        innerWidth: 3440,
        innerHeight: 1440,
      };
      global.window = mockWindow as any;

      const resolution = detectOBSResolution();

      // Should find closest resolution (1440p is closer than 4K)
      expect(resolution.name).toBe('1440p');
    });
  });

  describe('getAdaptiveFontSize', () => {
    it('should scale font size based on resolution', () => {
      const baseSize = 36;

      const size1080p = getAdaptiveFontSize(baseSize, COMMON_OBS_RESOLUTIONS[0]);
      const size4K = getAdaptiveFontSize(baseSize, COMMON_OBS_RESOLUTIONS[2]);

      expect(size4K).toBeGreaterThan(size1080p);
      expect(size4K / size1080p).toBeCloseTo(2.0); // 4K scale is 2.0
    });

    it('should enforce minimum font size for readability', () => {
      const smallBaseSize = 12;
      const lowRes = COMMON_OBS_RESOLUTIONS[3]; // 720p with scale 0.67

      const adaptiveSize = getAdaptiveFontSize(smallBaseSize, lowRes);

      expect(adaptiveSize).toBeGreaterThanOrEqual(24);
    });

    it('should enforce maximum font size to prevent overflow', () => {
      const largeBaseSize = 200;
      const highRes = COMMON_OBS_RESOLUTIONS[2]; // 4K with scale 2.0

      const adaptiveSize = getAdaptiveFontSize(largeBaseSize, highRes);

      expect(adaptiveSize).toBeLessThanOrEqual(96);
    });
  });

  describe('getAdaptiveSpacing', () => {
    it('should scale spacing proportionally to resolution', () => {
      const baseSpacing = 16;

      const spacing1080p = getAdaptiveSpacing(baseSpacing, COMMON_OBS_RESOLUTIONS[0]);
      const spacing1440p = getAdaptiveSpacing(baseSpacing, COMMON_OBS_RESOLUTIONS[1]);

      expect(spacing1440p).toBeGreaterThan(spacing1080p);
      expect(spacing1440p / spacing1080p).toBeCloseTo(1.33);
    });
  });

  describe('getOptimizedAnimationDuration', () => {
    it('should provide faster animations for higher resolutions', () => {
      const duration1080p = getOptimizedAnimationDuration(COMMON_OBS_RESOLUTIONS[0]);
      const duration4K = getOptimizedAnimationDuration(COMMON_OBS_RESOLUTIONS[2]);

      expect(duration4K).toBeLessThan(duration1080p);
    });

    it('should enforce minimum animation duration', () => {
      const duration4K = getOptimizedAnimationDuration(COMMON_OBS_RESOLUTIONS[2]);

      expect(duration4K).toBeGreaterThanOrEqual(0.3);
    });
  });
});