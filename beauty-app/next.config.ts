import type { NextConfig } from "next";

// Importamos o next-pwa usando require (padrão do pacote)
const withPWA = require("next-pwa")({
  dest: "public",
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === "development", // Desativa em localhost
});

const nextConfig: NextConfig = {
  // Suas outras configurações (se tiver images, etc)
  reactStrictMode: true,
};

// Envolvemos a config no withPWA
export default withPWA(nextConfig);