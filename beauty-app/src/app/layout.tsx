import type { Metadata } from "next";
import { Inter } from "next/font/google"; 
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

// --- CONFIGURAÇÃO DE SEO E WHATSAPP ---
export const metadata: Metadata = {
  // Título que aparece na aba do navegador
  title: "Studio de Beleza | Agendamento Online",
  
  // Descrição para o Google
  description: "Agende seu horário para Design de Sobrancelhas, Cílios e Micropigmentação. Atendimento exclusivo e pagamento facilitado.",
  
  // URL Base do seu site (NECESSÁRIO para a imagem funcionar)
  metadataBase: new URL("https://teste-drab-rho-60.vercel.app"),

  // Configuração para Facebook, WhatsApp, LinkedIn, etc.
  openGraph: {
    title: "Realce sua beleza única ✨",
    description: "Clique aqui para ver nossos horários disponíveis e agendar seu procedimento em segundos.",
    url: "https://teste-drab-rho-60.vercel.app",
    siteName: "Studio de Beleza",
    locale: "pt_BR",
    type: "website",
    images: [
      {
        url: "/capa.jpg", // A imagem que você colocou na pasta public
        width: 1200,
        height: 630,
        alt: "Capa do Studio de Beleza",
      },
    ],
  },

  // Configuração para Twitter/X
  twitter: {
    card: "summary_large_image",
    title: "Studio de Beleza | Agende Agora",
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