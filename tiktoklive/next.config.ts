import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Optimisations spécifiques pour l'overlay OBS
  experimental: {
    optimizePackageImports: ['@heroicons/react', 'lucide-react'],
  },
  turbopack: {},

  // Configuration de build pour overlay
  webpack: (config, { buildId, dev, isServer, defaultLoaders, webpack }) => {
    // Optimisations spécifiques pour les pages overlay
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
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            priority: 5,
          },
        },
      };
    }

    return config;
  },

  // Headers spécifiques pour l'overlay
  async headers() {
    return [
      {
        source: '/overlay',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },

  // Compression et optimisation
  compress: true,
  poweredByHeader: false,

  // Images optimisées (même si on n'en utilise pas beaucoup dans l'overlay)
  images: {
    unoptimized: true, // Pour overlay OBS, éviter les transformations d'images
  },
};

export default nextConfig;
