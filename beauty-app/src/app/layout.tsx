import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
// IMPORTANTE: Agora usamos o Sonner
import { Toaster } from "@/components/ui/sonner";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Studio Beauty App",
  description: "Agende seu horário online",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className={inter.className}>
        <main>{children}</main>
        {/* O Toaster do Sonner fica aqui */}
        <Toaster /> 
      </body>
    </html>
  );
}