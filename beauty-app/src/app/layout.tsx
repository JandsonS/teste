import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { SITE_CONFIG } from "@/constants/info";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: `${SITE_CONFIG.name} | Agendamento`,
  description: SITE_CONFIG.description,
  // 👇 ADICIONEI ESTA LINHA (Obrigatória para o botão instalar aparecer)
  manifest: "/manifest.json",
  icons: {
    icon: SITE_CONFIG.images.logo,
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