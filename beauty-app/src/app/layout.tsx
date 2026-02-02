import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { SITE_CONFIG } from "@/constants/info";
import { prisma } from "@/lib/prisma";

const inter = Inter({ subsets: ["latin"] });

export async function generateMetadata(): Promise<Metadata> {
  // 1. Padrão: Se o banco falhar, usa "Barbearia App" e a logo local
  let siteName = "Barbearia App"; 
  let iconUrl = "/logo.png"; // <--- Garanta que tem um arquivo logo.png na pasta public

  try {
    const settings = await prisma.configuracao.findUnique({
      where: { id: "settings" }
    });
    
    if (settings) {
      // Se o dono mudou o nome, pega do banco
      if (settings.nomeEstabelecimento) {
        siteName = settings.nomeEstabelecimento;
      }
      // Se o dono subiu logo, pega do banco. Senão, mantém a local /logo.png
      if (settings.logoUrl && settings.logoUrl.length > 5) {
        iconUrl = settings.logoUrl;
      }
    }
  } catch (error) {
    console.error("Erro ao buscar config:", error);
  }

  return {
    // AQUI ESTÁ A CORREÇÃO DO NOME DUPLICADO:
    title: {
      default: siteName,
      template: `%s`, // Removemos qualquer texto extra aqui
      absolute: siteName, // <--- O 'absolute' proíbe o Next.js de juntar nomes
    },
    description: "Agende seu horário com praticidade.",
    icons: {
      icon: iconUrl,
      shortcut: iconUrl,
      apple: iconUrl,
    },
  };
}

// --- 2. CONFIGURAÇÃO DE TEMA (CORES) ---
async function getThemeSettings() {
  try {
    const config = await prisma.configuracao.findUnique({
       where: { id: "settings" } 
    });
    return {
      color: config?.corPrincipal || "#10b981", 
    };
  } catch (error) {
    return { color: "#10b981" };
  }
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Busca a cor para pintar o CSS
  const theme = await getThemeSettings();

  return (
    <html lang="pt-BR" className="dark">
      <body className={inter.className}>
        
        {/* Injeta a Cor Dinâmica no CSS Global */}
        <style>{`
          :root {
            --primary-color: ${theme.color};
          }
          .bg-primary-custom { background-color: var(--primary-color) !important; }
          .text-primary-custom { color: var(--primary-color) !important; }
          .border-primary-custom { border-color: var(--primary-color) !important; }
          .hover\\:bg-primary-custom:hover { 
            background-color: var(--primary-color) !important; 
            filter: brightness(0.9);
          }
        `}</style>

        {children}
        <Toaster />
      </body>
    </html>
  );
}