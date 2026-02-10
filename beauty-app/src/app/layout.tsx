import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
// import { SITE_CONFIG } from "@/constants/info"; // Pode manter ou comentar se não usar
// import { prisma } from "@/lib/prisma"; // Comentamos pois o layout global não deve chamar o banco

const inter = Inter({ subsets: ["latin"] });

export async function generateMetadata(): Promise<Metadata> {
  // --- ADAPTAÇÃO: ---
  // Como o Layout Global não sabe qual barbearia é (isso acontece na URL),
  // definimos valores genéricos para não quebrar o site.
  // Os dados reais (Nome da Barbearia) serão carregados na página interna [slug]/page.tsx
  
  const siteName = "Agendamento App"; 
  const iconUrl = "/logo.png"; // Garanta que esta imagem existe em /public

  return {
    title: {
      default: siteName,
      template: `%s`, 
      absolute: siteName, 
    },
    description: "Agende seu horário com praticidade.",
    icons: {
      icon: iconUrl,
      shortcut: iconUrl,
      apple: iconUrl,
    },
  };
}

// --- 2. CONFIGURAÇÃO DE TEMA (ADAPTADA) ---
// Mantivemos sua função, mas removemos a chamada ao banco que causava o Erro 500
async function getThemeSettings() {
  // Retornamos uma cor padrão segura.
  // A cor "Real" da barbearia será aplicada pela página interna depois.
  return { color: "#10b981" }; 
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Busca a cor padrão (agora sem quebrar o banco)
  const theme = await getThemeSettings();

  return (
    <html lang="pt-BR" className="dark">
      <body className={inter.className}>
        
        {/* MANTIDA SUA LÓGICA DE CSS EXATAMENTE IGUAL */}
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