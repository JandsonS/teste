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
  
  // Desativa mapas de código para economizar memória
  productionBrowserSourceMaps: false, 
  
  // Ignora erros de TypeScript no build
  typescript: {
    ignoreBuildErrors: true,
  },
};

module.exports = withPWA(nextConfig);