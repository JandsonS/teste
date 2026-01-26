import { MetadataRoute } from "next";
import { SITE_CONFIG } from "@/constants/info";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: SITE_CONFIG.name,             // Puxa o nome do cliente
    short_name: SITE_CONFIG.name,       // Nome curto (embaixo do ícone)
    description: SITE_CONFIG.description,
    start_url: "/admin",                // Onde o App abre
    display: "standalone",
    background_color: "#09090b",
    theme_color: "#10b981",
    icons: [
      {
        src: SITE_CONFIG.images.logo,   // Puxa a Logo do cliente automaticamente
        sizes: "192x192",
        type: "image/png",
        purpose: "any maskable" as any, // 👈 O "as any" resolve o erro vermelho
      },
      {
        src: SITE_CONFIG.images.logo,
        sizes: "512x512",
        type: "image/png",
        purpose: "any maskable" as any, // 👈 Mesma coisa aqui
      },
    ],
  };
}