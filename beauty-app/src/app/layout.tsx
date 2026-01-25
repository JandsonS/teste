import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { SITE_CONFIG } from "@/constants/info"; // Importamos sua configuração

const inter = Inter({ subsets: ["latin"] });

// AQUI ESTÁ A MUDANÇA:
// O ícone agora obedece o link que você colocar em 'images.logo' no info.ts
export const metadata: Metadata = {
  title: `${SITE_CONFIG.name} | Agendamento`,
  description: SITE_CONFIG.description,
  icons: {
    icon: SITE_CONFIG.images.logo, // <--- O PULO DO GATO ESTÁ AQUI
    shortcut: SITE_CONFIG.images.logo,
    apple: SITE_CONFIG.images.logo,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className="dark">
      <body className={inter.className}>
        {children}
        <Toaster />
      </body>
    </html>
  );
}

  