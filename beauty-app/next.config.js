/** @type {import('next').NextConfig} */
const withPWA = require("@ducanh2912/next-pwa").default({
  dest: "public",
  workboxOptions: {
    disableDevLogs: true,
    importScripts: ["/custom-worker.js"],
  },
});

const nextConfig = {
  reactStrictMode: true,
  productionBrowserSourceMaps: false, 
  typescript: {
    ignoreBuildErrors: true,
  },
  // 👇 ADICIONE ESTE BLOCO DO WEBPACK AQUI 👇
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        fs: false,
        net: false,
        tls: false,
        child_process: false,
      };
    }
    return config;
  },
};

module.exports = withPWA(nextConfig);
module.exports = nextConfig;