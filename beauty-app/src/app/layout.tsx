import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { SITE_CONFIG } from "@/constants/info"; // Importamos a config

const inter = Inter({ subsets: ["latin"] });

// AQUI É A MÁGICA: O Metadata puxa os dados do SITE_CONFIG
export const metadata: Metadata = {
  title: `${SITE_CONFIG.name} | Agendamento`,
  description: SITE_CONFIG.description,
  icons: {
    icon: "/favicon.ico", // O ícone geralmente fica na pasta 'public'
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