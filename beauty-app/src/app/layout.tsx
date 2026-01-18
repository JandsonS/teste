import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
// 👇 IMPORTANTE: Importamos o nosso componente seguro agora
import { ToasterClient } from "@/components/ToasterClient"; 

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Barber Shop Agendamentos",
  description: "Agende seu horário com facilidade.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className={inter.className}>
        {children}
        
        {/* 👇 O "Carteiro" seguro entra aqui */}
        <ToasterClient />
        
      </body>
    </html>
  );
}