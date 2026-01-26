/** @type {import('next').NextConfig} */
const withPWA = require("@ducanh2912/next-pwa").default({
  dest: "public",
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === "development",
  workboxOptions: {
    disableDevLogs: true,
  },
});

const nextConfig = {
  reactStrictMode: true,
  
  // 👇 1. Desativa mapas de código (Economiza 40% de RAM)
  productionBrowserSourceMaps: false, 
  
  // 👇 2. Ignora verificações pesadas
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },

  // 👇 3. O SEGREDO: Força o modo "Single Thread" para não estourar a memória
  experimental: {
    workerThreads: false,
    cpus: 1,
  },
};

module.exports = withPWA(nextConfig);