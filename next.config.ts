import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Autoriser les requêtes cross-origin en développement
  // Utile pour accéder depuis OBS Browser Source ou autres appareils réseau
  allowedDevOrigins: process.env.NODE_ENV === "development" 
    ? ["192.168.1.173", "localhost", "127.0.0.1"]
    : undefined,
};

export default nextConfig;
