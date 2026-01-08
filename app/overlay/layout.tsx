import { ReactNode } from 'react';
import { Russo_One, Rajdhani, Orbitron, Barlow_Condensed } from 'next/font/google';

// Fonts Neo-Brutalist Arcade
const russoOne = Russo_One({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
});

const rajdhani = Rajdhani({
  weight: ['300', '400', '500', '600', '700'],
  subsets: ['latin'],
  variable: '--font-body',
  display: 'swap',
});

const orbitron = Orbitron({
  weight: ['400', '500', '600', '700', '800', '900'],
  subsets: ['latin'],
  variable: '--font-heading',
  display: 'swap',
});

const barlowCondensed = Barlow_Condensed({
  weight: ['100', '200', '300', '400', '500', '600', '700', '800', '900'],
  subsets: ['latin'],
  variable: '--font-condensed',
  display: 'swap',
});

// Layout optimisé pour overlay TikTok - Neo-Brutalist Arcade
interface OverlayLayoutProps {
  children: ReactNode;
}

export default function OverlayLayout({ children }: OverlayLayoutProps) {
  return (
    <div
      className={`
        ${russoOne.variable}
        ${rajdhani.variable}
        ${orbitron.variable}
        ${barlowCondensed.variable}
        relative w-full h-screen max-w-sm mx-auto bg-transparent
      `}
    >
      {children}
    </div>
  );
}