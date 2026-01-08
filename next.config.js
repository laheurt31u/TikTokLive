/** @type {import('next').NextConfig} */
const nextConfig = {
  // Ignore Archive and other dev folders
  pageExtensions: ['tsx', 'ts', 'jsx', 'js'],

  // Optimisations pour l'overlay OBS
  experimental: {
    optimizePackageImports: ['@heroicons/react'],
  },

  // Configuration du build optimisé pour overlay
  webpack: (config, { buildId, dev, isServer, defaultLoaders, webpack }) => {
    // Ignore Archive directory
    config.module.rules.push({
      test: /Archive/,
      loader: 'ignore-loader',
    });

    // Optimisations spécifiques overlay
    if (!dev && !isServer) {
      config.optimization.splitChunks = {
        chunks: 'all',
        cacheGroups: {
          overlay: {
            test: /[\\/]app[\\/]overlay[\\/]/,
            name: 'overlay',
            priority: 10,
            enforce: true,
          },
          framework: {
            chunks: 'all',
            name: 'framework',
            test: /(?<!node_modules.*)[\\/]node_modules[\\/](react|react-dom|scheduler|prop-types|use-subscription)[\\/]/,
            priority: 40,
            enforce: true,
          },
          lib: {
            test: /[\\/]node_modules[\\/]/,
            name: 'lib',
            priority: 30,
          },
        },
      };
    }

    // Configuration simplifiée pour performance
    // Les optimisations GPU seront gérées via CSS

    return config;
  },

  // Images optimisées pour streaming
  images: {
    formats: ['image/webp', 'image/avif'],
    minimumCacheTTL: 31536000, // 1 an pour les avatars
  },

  // Headers pour performance OBS
  async headers() {
    return [
      {
        source: '/app/overlay/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
          {
            key: 'X-Overlay-Optimized',
            value: 'true',
          },
        ],
      },
    ];
  },

  // Bundle analyzer désactivé pour éviter les dépendances
};

module.exports = nextConfig;