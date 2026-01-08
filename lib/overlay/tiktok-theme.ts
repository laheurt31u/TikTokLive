// TikTok Live Overlay Design System
// Optimisé pour format vertical 9:16, safe zones 80%, GPU acceleration

export const tiktokTheme = {
  // Layout & Spacing
  layout: {
    aspectRatio: '9/16', // Vertical TikTok format
    safeZone: 0.8, // 80% central safe zone
    maxWidth: '400px', // Mobile-first width
    borderRadius: {
      small: '8px',
      medium: '12px',
      large: '16px',
      xl: '24px'
    }
  },

  // Colors - TikTok Inspired
  colors: {
    primary: '#FE2C55',      // TikTok Red
    secondary: '#00F2EA',    // TikTok Cyan
    accent: '#FFD700',       // Gold for winners
    background: {
      overlay: 'rgba(0, 0, 0, 0.8)',
      card: 'rgba(0, 0, 0, 0.9)',
      modal: 'rgba(254, 44, 85, 0.95)'
    },
    text: {
      primary: '#FFFFFF',
      secondary: '#F5F5F5',
      muted: 'rgba(255, 255, 255, 0.6)',
      accent: '#00F2EA'
    },
    status: {
      correct: '#10B981',    // Green
      incorrect: '#EF4444',  // Red
      pending: '#F59E0B',    // Yellow
      rateLimited: '#F97316' // Orange
    }
  },

  // Typography - System Fonts for Performance
  typography: {
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    fontWeight: {
      normal: '400',
      medium: '500',
      semibold: '600',
      bold: '700',
      black: '900'
    },
    sizes: {
      xs: '12px',
      sm: '14px',
      base: '16px',
      lg: '18px',
      xl: '20px',
      '2xl': '24px',
      '3xl': '30px',
      '4xl': '36px'
    },
    lineHeight: {
      tight: '1.25',
      normal: '1.5',
      relaxed: '1.75'
    }
  },

  // Animations - GPU Accelerated
  animations: {
    duration: {
      fast: '150ms',
      normal: '300ms',
      slow: '500ms',
      slower: '700ms'
    },
    easing: {
      ease: 'cubic-bezier(0.4, 0.0, 0.2, 1)',
      easeIn: 'cubic-bezier(0.4, 0.0, 1, 1)',
      easeOut: 'cubic-bezier(0.0, 0.0, 0.2, 1)',
      easeInOut: 'cubic-bezier(0.4, 0.0, 0.2, 1)'
    },
    keyframes: {
      bounce: 'bounce 1s infinite',
      pulse: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      ping: 'ping 1s cubic-bezier(0, 0, 0.2, 1) infinite',
      spin: 'spin 1s linear infinite'
    }
  },

  // Shadows & Effects
  shadows: {
    small: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    medium: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
    large: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
    glow: {
      primary: '0 0 20px rgba(254, 44, 85, 0.5)',
      secondary: '0 0 20px rgba(0, 242, 234, 0.5)',
      winner: '0 0 30px rgba(255, 215, 0, 0.6)'
    }
  },

  // Component Tokens
  components: {
    questionDisplay: {
      padding: '24px',
      borderRadius: '16px',
      timerSize: '64px',
      maxWidth: '320px'
    },
    leaderboard: {
      maxWidth: '320px',
      itemHeight: '48px',
      avatarSize: '32px',
      borderRadius: '12px'
    },
    winnerOverlay: {
      padding: '32px',
      borderRadius: '24px',
      avatarSize: '96px',
      animationDuration: '8000ms'
    },
    responseIndicator: {
      padding: '12px 16px',
      borderRadius: '12px',
      maxWidth: '280px',
      autoHideDelay: '4000ms'
    }
  },

  // Breakpoints - Mobile First
  breakpoints: {
    mobile: '320px',
    tablet: '768px',
    desktop: '1024px'
  },

  // Z-Index Scale
  zIndex: {
    base: 1,
    overlay: 10,
    modal: 50,
    celebration: 100
  }
} as const;

// Utility functions
export const getResponsiveValue = (value: string | number, screenWidth: number): string => {
  // Simple responsive logic for TikTok format
  if (screenWidth < 375) return typeof value === 'number' ? `${value * 0.8}px` : value;
  if (screenWidth < 414) return typeof value === 'number' ? `${value * 0.9}px` : value;
  return typeof value === 'number' ? `${value}px` : value;
};

export const applySafeZone = (maxWidth: number): number => {
  return maxWidth * tiktokTheme.layout.safeZone;
};

// Type exports
export type TikTokTheme = typeof tiktokTheme;
export type ColorScheme = keyof typeof tiktokTheme.colors.status;