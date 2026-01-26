/** @type {import('next').NextConfig} */
const withPWA = require("@ducanh2912/next-pwa").default({
// ... resto igual ...
  dest: "public",
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === "development",
  // 👇 ISOLA ARQUIVOS QUE TRAVAM A VERCEL
  buildExcludes: [/middleware-manifest.json$/],
});

const nextConfig = {
  reactStrictMode: true,
  
  // 👇 O SEGREDO: ISSO ECONOMIZA MUITA MEMÓRIA
  productionBrowserSourceMaps: false, 
  
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
};

module.exports = withPWA(nextConfig);