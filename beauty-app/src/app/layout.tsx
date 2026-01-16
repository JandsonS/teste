import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { SITE_CONFIG } from "@/constants/info"; // Importando suas configurações

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  // Título dinâmico
  title: `${SITE_CONFIG.name} | Agendamento Online`,
  description: SITE_CONFIG.description,
  
  // Ícone Dinâmico (Lê direto da sua configuração de Logo)
  icons: {
    icon: SITE_CONFIG.images.logo, 
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-br">
      <body className={inter.className}>{children}</body>
    </html>
  );
}