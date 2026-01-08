import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'TikTokLive',
  description: 'Système de quiz interactif pour TikTok Live',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}