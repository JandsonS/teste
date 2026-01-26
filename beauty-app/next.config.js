/** @type {import('next').NextConfig} */
const withPWA = require("@ducanh2912/next-pwa").default({
  dest: "public",
  // ... suas outras configs ...
  workboxOptions: {
    disableDevLogs: true,
    importScripts: ["/custom-worker.js"], // 👈 ADICIONE ISSO!
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