import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'TikTokLive Overlay',
  description: 'Overlay optimisé pour OBS Browser Source',
};

export default function OverlayLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <head>
        {/* Optimisations pour OBS Browser Source */}
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <meta name="color-scheme" content="dark" />

        {/* Désactiver les interactions utilisateur pour OBS */}
        <style>{`
          * {
            -webkit-user-select: none;
            -moz-user-select: none;
            -ms-user-select: none;
            user-select: none;
            -webkit-touch-callout: none;
            -webkit-tap-highlight-color: transparent;
          }

          /* Optimisations performance pour streaming */
          html {
            -webkit-font-smoothing: antialiased;
            -moz-osx-font-smoothing: grayscale;
          }

          /* Prévenir le scroll et zoom */
          body {
            overflow: hidden;
            touch-action: none;
            -webkit-overflow-scrolling: touch;
          }

          /* GPU acceleration pour animations */
          .gpu-accelerated {
            transform: translateZ(0);
            backface-visibility: hidden;
            perspective: 1000px;
          }
        `}</style>
      </head>
      <body className="bg-transparent font-sans antialiased">
        {children}

        {/* Script pour détecter la résolution OBS */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                function updateViewport() {
                  const width = window.innerWidth;
                  const height = window.innerHeight;
                  document.documentElement.style.setProperty('--viewport-width', width + 'px');
                  document.documentElement.style.setProperty('--viewport-height', height + 'px');

                  // Classes pour différentes résolutions
                  document.body.classList.remove('obs-720p', 'obs-1080p', 'obs-1440p', 'obs-4k');
                  if (height <= 720) document.body.classList.add('obs-720p');
                  else if (height <= 1080) document.body.classList.add('obs-1080p');
                  else if (height <= 1440) document.body.classList.add('obs-1440p');
                  else document.body.classList.add('obs-4k');
                }

                updateViewport();
                window.addEventListener('resize', updateViewport);
              })();
            `,
          }}
        />
      </body>
    </html>
  );
}