import type { Metadata } from "next";
import { Inter } from "next/font/google"; 
import "./globals.css";
import { SITE_CONFIG } from "@/constants/info"; // Importamos o arquivo mestre

const inter = Inter({ subsets: ["latin"] });

// --- CONFIGURAÇÃO DE SEO E WHATSAPP (Agora automática!) ---
export const metadata: Metadata = {
  // Título dinâmico (ex: "Studio X | Agendamento Online")
  title: `${SITE_CONFIG.name} | Agendamento Online`,
  
  // Descrição vinda do arquivo de configuração
  description: SITE_CONFIG.description,
  
  // URL Base (para a imagem funcionar no Zap)
  metadataBase: new URL(SITE_CONFIG.url),

  // Configuração para Facebook, WhatsApp, etc.
  openGraph: {
    title: `Agende no ${SITE_CONFIG.name} ✨`,
    description: "Clique aqui para ver nossos horários disponíveis e agendar seu procedimento em segundos.",
    url: SITE_CONFIG.url,
    siteName: SITE_CONFIG.name,
    locale: "pt_BR",
    type: "website",
    images: [
      {
        url: "/capa.jpg", 
        width: 1200,
        height: 630,
        alt: `Capa do ${SITE_CONFIG.name}`,
      },
    ],
  },

  // Configuração para Twitter/X
  twitter: {
    card: "summary_large_image",
    title: `${SITE_CONFIG.name} | Agende Agora`,
    description: "Confira nossos serviços e garanta seu horário.",
    images: ["/capa.jpg"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className="dark">
      <body className={`${inter.className} bg-zinc-950 text-zinc-100 antialiased selection:bg-pink-500/30`}>
        {/* Fundo com efeito de luz sutil */}
        <div className="fixed inset-0 -z-10 h-full w-full bg-zinc-950 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(236,72,153,0.15),rgba(255,255,255,0))]"></div>
        {children}
      </body>
    </html>
  );
}