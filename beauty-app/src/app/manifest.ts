import { MetadataRoute } from "next";
import { SITE_CONFIG } from "@/constants/info";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: SITE_CONFIG.name,             // Nome do App
    short_name: SITE_CONFIG.name,       // Nome curto
    description: SITE_CONFIG.description,
    start_url: "/admin",                // Onde abre
    display: "standalone",              // Abre sem barra de navegador (Cara de App)
    background_color: "#09090b",
    theme_color: "#10b981",
    
    // 👇 O SEGREDO PARA MATAR O SINO ESTÁ AQUI 👇
    icons: [
      {
        src: SITE_CONFIG.images.logo,   // Sua logo (ex: 512x512)
        sizes: "192x192",
        type: "image/png",
        // 'maskable' permite que o Android preencha o ícone inteiro, sem bordas brancas
        purpose: "any maskable" as any, 
      },
      {
        src: SITE_CONFIG.images.logo,
        sizes: "512x512",
        type: "image/png",
        purpose: "any maskable" as any,
      },
      // Ícone padrão (caso o maskable falhe em algum navegador antigo)
      {
        src: SITE_CONFIG.images.logo,
        sizes: "512x512",
        type: "image/png",
        purpose: "any" as any, 
      },
    ],
  };
}