// Utilitaires pour l'optimisation de l'overlay OBS

export interface OBSResolution {
  width: number;
  height: number;
  name: string;
  scale: number;
}

export const COMMON_OBS_RESOLUTIONS: OBSResolution[] = [
  { width: 1920, height: 1080, name: '1080p', scale: 1.0 },
  { width: 2560, height: 1440, name: '1440p', scale: 1.33 },
  { width: 3840, height: 2160, name: '4K', scale: 2.0 },
  { width: 1280, height: 720, name: '720p', scale: 0.67 },
];

/**
 * Détecte automatiquement la résolution d'écran OBS
 */
export function detectOBSResolution(): OBSResolution {
  if (typeof window === 'undefined') {
    // Server-side rendering fallback
    return COMMON_OBS_RESOLUTIONS[0];
  }

  const { innerWidth, innerHeight } = window;

  // Trouver la résolution la plus proche
  let closestResolution = COMMON_OBS_RESOLUTIONS[0];
  let minDifference = Infinity;

  for (const resolution of COMMON_OBS_RESOLUTIONS) {
    const difference = Math.abs(resolution.width - innerWidth) + Math.abs(resolution.height - innerHeight);
    if (difference < minDifference) {
      minDifference = difference;
      closestResolution = resolution;
    }
  }

  return closestResolution;
}

/**
 * Calcule la taille de police adaptative basée sur la résolution
 */
export function getAdaptiveFontSize(baseSize: number, resolution: OBSResolution): number {
  // Ajuster la taille de base selon l'échelle de résolution
  const scaledSize = baseSize * resolution.scale;

  // Limiter les tailles extrêmes pour la lisibilité
  return Math.max(24, Math.min(96, scaledSize));
}

/**
 * Calcule les espacements adaptatifs
 */
export function getAdaptiveSpacing(baseSpacing: number, resolution: OBSResolution): number {
  return baseSpacing * resolution.scale;
}

/**
 * Optimise les animations pour la résolution détectée
 */
export function getOptimizedAnimationDuration(resolution: OBSResolution): number {
  // Animations plus rapides sur les hautes résolutions pour fluidité
  const baseDuration = 0.6;
  return Math.max(0.3, baseDuration / resolution.scale);
}

/**
 * Hook React pour la gestion responsive OBS
 */
export function useOBSResponsive() {
  // Dans un vrai hook React, ceci utiliserait useState et useEffect
  // Pour l'instant, retourner les valeurs calculées
  const resolution = detectOBSResolution();

  return {
    resolution,
    fontSize: (base: number) => getAdaptiveFontSize(base, resolution),
    spacing: (base: number) => getAdaptiveSpacing(base, resolution),
    animationDuration: getOptimizedAnimationDuration(resolution),
  };
}