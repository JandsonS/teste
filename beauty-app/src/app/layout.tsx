import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { SITE_CONFIG } from "@/constants/info";
import { prisma } from "@/lib/prisma";

const inter = Inter({ subsets: ["latin"] });

// --- MUDANÇA PRINCIPAL: TÍTULO DINÂMICO ---
// Essa função roda antes da página carregar para decidir o que escrever na aba do navegador
export async function generateMetadata(): Promise<Metadata> {
  let siteName = SITE_CONFIG.name; // Começa com o nome padrão

  try {
    // Tenta buscar o nome personalizado no banco
    const settings = await prisma.configuracao.findUnique({
      where: { id: "settings" }
    });
    
    if (settings?.nomeEstabelecimento) {
      siteName = settings.nomeEstabelecimento;
    }
  } catch (error) {
    // Se der erro, mantém o padrão
  }

  return {
    title: `${siteName} | Agendamento`,
    description: SITE_CONFIG.description,
  };
}

// Função para buscar a Cor (Tema)
async function getThemeSettings() {
  try {
    const config = await prisma.configuracao.findUnique({
       where: { id: "settings" } 
    });
    return {
      color: config?.corPrincipal || "#10b981", 
      name: config?.nomeEstabelecimento || SITE_CONFIG.name
    };
  } catch (error) {
    return { color: "#10b981", name: SITE_CONFIG.name };
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
          /* Classes utilitárias para usar a cor dinâmica */
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