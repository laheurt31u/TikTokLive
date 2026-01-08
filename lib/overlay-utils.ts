/**
 * Utilitaires pour l'overlay OBS - Optimisations performance et responsive design
 */

export interface OBSResolution {
  width: number;
  height: number;
  name: '720p' | '1080p' | '1440p' | '4K' | 'unknown';
  aspectRatio: number;
  isPortrait: boolean;
}

/**
 * Détecte la résolution d'écran OBS et retourne les informations associées
 */
export function detectOBSResolution(): OBSResolution {
  if (typeof window === 'undefined') {
    return {
      width: 1920,
      height: 1080,
      name: '1080p',
      aspectRatio: 16/9,
      isPortrait: false
    };
  }

  const width = window.innerWidth;
  const height = window.innerHeight;
  const aspectRatio = width / height;

  let name: OBSResolution['name'] = 'unknown';

  if (height <= 720) name = '720p';
  else if (height <= 1080) name = '1080p';
  else if (height <= 1440) name = '1440p';
  else if (height <= 2160) name = '4K';
  else name = 'unknown';

  return {
    width,
    height,
    name,
    aspectRatio,
    isPortrait: aspectRatio < 1
  };
}

/**
 * Calcule la taille de police optimale selon la résolution OBS
 */
export function getOptimalFontSize(baseSize: number, resolution: OBSResolution): number {
  const scaleFactors = {
    '720p': 0.8,
    '1080p': 1.0,
    '1440p': 1.2,
    '4K': 1.4,
    'unknown': 1.0
  };

  return Math.round(baseSize * scaleFactors[resolution.name]);
}

/**
 * Calcule l'espacement optimal selon la résolution OBS
 */
export function getOptimalSpacing(baseSpacing: number, resolution: OBSResolution): number {
  const scaleFactors = {
    '720p': 0.9,
    '1080p': 1.0,
    '1440p': 1.1,
    '4K': 1.2,
    'unknown': 1.0
  };

  return Math.round(baseSpacing * scaleFactors[resolution.name]);
}

/**
 * Hook React pour suivre les changements de résolution OBS
 */
export function useOBSResolution() {
  const [resolution, setResolution] = React.useState<OBSResolution>(detectOBSResolution);

  React.useEffect(() => {
    const updateResolution = () => {
      setResolution(detectOBSResolution());
    };

    window.addEventListener('resize', updateResolution);
    return () => window.removeEventListener('resize', updateResolution);
  }, []);

  return resolution;
}

/**
 * Optimise les animations pour le streaming OBS
 */
export function optimizeAnimationsForOBS() {
  // Forcer GPU acceleration
  const style = document.createElement('style');
  style.textContent = `
    .obs-optimized {
      transform: translateZ(0);
      backface-visibility: hidden;
      -webkit-backface-visibility: hidden;
      will-change: transform;
    }

    .obs-optimized-animation {
      animation-fill-mode: forwards;
      animation-timing-function: ease-out;
    }

    /* Désactiver les animations coûteuses sur les résolutions basses */
    @media (max-height: 720px) {
      .obs-optimized-animation {
        animation-duration: 0.2s !important;
      }
    }
  `;
  document.head.appendChild(style);

  return () => document.head.removeChild(style);
}

/**
 * Mesure les performances du rendu pour détecter les frames > 16ms
 */
export class PerformanceMonitor {
  private frameCount = 0;
  private frameDrops = 0;
  private lastFrameTime = 0;
  private callback?: (metrics: { frameDrops: number; averageFrameTime: number }) => void;

  start(callback?: (metrics: { frameDrops: number; averageFrameTime: number }) => void) {
    this.callback = callback;
    this.monitorFrame();
  }

  stop() {
    this.frameCount = 0;
    this.frameDrops = 0;
    this.callback = undefined;
  }

  private monitorFrame = () => {
    const currentTime = performance.now();
    const deltaTime = currentTime - this.lastFrameTime;

    if (this.lastFrameTime > 0 && deltaTime > 16.67) { // > 60fps
      this.frameDrops++;
    }

    this.lastFrameTime = currentTime;
    this.frameCount++;

    if (this.callback && this.frameCount % 60 === 0) { // Tous les ~1 seconde
      this.callback({
        frameDrops: this.frameDrops,
        averageFrameTime: deltaTime
      });
    }

    if (this.frameCount < 3600) { // Monitor pendant 1 minute maximum
      requestAnimationFrame(this.monitorFrame);
    }
  };
}

/**
 * Utilitaires pour la gestion des assets optimisés
 */
export const assetOptimization = {
  /**
   * Précharge les images critiques pour éviter les freezes
   */
  preloadCriticalImages: (imageUrls: string[]): Promise<void[]> => {
    const promises = imageUrls.map(url => {
      return new Promise<void>((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve();
        img.onerror = reject;
        img.src = url;
      });
    });
    return Promise.all(promises);
  },

  /**
   * Lazy load les images non-critiques
   */
  lazyLoadImage: (src: string): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });
  }
};

/**
 * Configuration OBS Browser Source optimale
 */
export const obsBrowserConfig = {
  recommended: {
    width: 1920,
    height: 1080,
    fps: 60,
    'shutdown-source-when-not-visible': true,
    'refresh-browser-when-scene-becomes-active': false,
    'reroute-audio': false
  },

  performance: {
    // Désactiver hardware acceleration si nécessaire
    disableHardwareAcceleration: false,
    // Utiliser GPU spécifique pour multi-GPU setups
    gpuIndex: 0
  }
};

// Export pour compatibilité avec les imports React
import React from 'react';