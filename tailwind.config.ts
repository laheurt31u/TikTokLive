import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'neon-magenta': '#ff0080',
        'neon-cyan': '#00fff9',
        'neon-yellow': '#ffff00',
        'neon-green': '#39ff14',
        'neon-orange': '#ff6600',
        'neon-purple': '#bf00ff',
        'black-deep': '#0a0a0a',
        'black-void': '#000000',
      },
      fontFamily: {
        'display': ['Russo One', 'sans-serif'],
        'heading': ['Orbitron', 'monospace'],
        'body': ['Rajdhani', 'sans-serif'],
        'condensed': ['Barlow Condensed', 'sans-serif'],
      },
      animation: {
        'glitch': 'glitch 0.3s ease-in-out infinite',
        'glitch-skew': 'glitch-skew 0.3s ease-in-out infinite',
        'neon-pulse': 'neon-pulse 2s ease-in-out infinite',
        'scanline-move': 'scanline-move 8s linear infinite',
        'flicker': 'flicker 3s ease-in-out infinite',
        'slide-in-top': 'slide-in-top 0.6s ease-out',
        'slide-in-bottom': 'slide-in-bottom 0.7s ease-out',
        'slide-in-left': 'slide-in-left 0.4s ease-out',
        'zoom-bounce': 'zoom-bounce 0.5s ease-out',
        'rotate-cw': 'rotate-cw 1s ease-in-out',
        'shake-intense': 'shake-intense 0.5s ease-in-out infinite',
        'wiggle': 'wiggle 2s ease-in-out infinite',
        'fade-in-slide-up': 'fade-in-slide-up 0.6s ease-out',
      },
      keyframes: {
        glitch: {
          '0%': { transform: 'translate(0)' },
          '20%': { transform: 'translate(-2px, 2px)' },
          '40%': { transform: 'translate(-2px, -2px)' },
          '60%': { transform: 'translate(2px, 2px)' },
          '80%': { transform: 'translate(2px, -2px)' },
          '100%': { transform: 'translate(0)' },
        },
        'glitch-skew': {
          '0%': { transform: 'skew(0deg)' },
          '10%': { transform: 'skew(-2deg)' },
          '20%': { transform: 'skew(2deg)' },
          '30%': { transform: 'skew(-2deg)' },
          '40%': { transform: 'skew(2deg)' },
          '50%': { transform: 'skew(0deg)' },
          '100%': { transform: 'skew(0deg)' },
        },
        'neon-pulse': {
          '0%, 100%': {
            filter: 'drop-shadow(0 0 5px currentColor) drop-shadow(0 0 15px currentColor)',
          },
          '50%': {
            filter: 'drop-shadow(0 0 10px currentColor) drop-shadow(0 0 30px currentColor)',
          },
        },
        'scanline-move': {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100%)' },
        },
        flicker: {
          '0%, 100%': { opacity: '1' },
          '41.99%': { opacity: '1' },
          '42%': { opacity: '0.8' },
          '43%': { opacity: '1' },
          '45.99%': { opacity: '1' },
          '46%': { opacity: '0.7' },
          '46.5%': { opacity: '1' },
        },
        'slide-in-top': {
          '0%': {
            transform: 'translateY(-100%) rotate(-2deg)',
            opacity: '0',
          },
          '100%': {
            transform: 'translateY(0) rotate(-2deg)',
            opacity: '1',
          },
        },
        'slide-in-bottom': {
          '0%': {
            transform: 'translateY(100%) rotate(2deg)',
            opacity: '0',
          },
          '100%': {
            transform: 'translateY(0) rotate(2deg)',
            opacity: '1',
          },
        },
        'slide-in-left': {
          '0%': {
            transform: 'translateX(-100%)',
            opacity: '0',
          },
          '100%': {
            transform: 'translateX(0)',
            opacity: '1',
          },
        },
        'zoom-bounce': {
          '0%': {
            transform: 'scale(0)',
            opacity: '0',
          },
          '50%': {
            transform: 'scale(1.1)',
          },
          '100%': {
            transform: 'scale(1)',
            opacity: '1',
          },
        },
        'rotate-cw': {
          from: { transform: 'rotate(0deg)' },
          to: { transform: 'rotate(360deg)' },
        },
        'shake-intense': {
          '0%, 100%': { transform: 'translate(0, 0) rotate(0deg)' },
          '10%': { transform: 'translate(-3px, -3px) rotate(-1deg)' },
          '20%': { transform: 'translate(3px, 3px) rotate(1deg)' },
          '30%': { transform: 'translate(-3px, 3px) rotate(-1deg)' },
          '40%': { transform: 'translate(3px, -3px) rotate(1deg)' },
          '50%': { transform: 'translate(-3px, -3px) rotate(-1deg)' },
          '60%': { transform: 'translate(3px, 3px) rotate(1deg)' },
          '70%': { transform: 'translate(-3px, 3px) rotate(-1deg)' },
          '80%': { transform: 'translate(3px, -3px) rotate(1deg)' },
          '90%': { transform: 'translate(-3px, -3px) rotate(-1deg)' },
        },
        wiggle: {
          '0%, 100%': { transform: 'rotate(0deg)' },
          '25%': { transform: 'rotate(5deg)' },
          '75%': { transform: 'rotate(-5deg)' },
        },
        'fade-in-slide-up': {
          '0%': {
            transform: 'translateY(20px)',
            opacity: '0',
          },
          '100%': {
            transform: 'translateY(0)',
            opacity: '1',
          },
        },
      },
    },
  },
  plugins: [],
}
export default config
