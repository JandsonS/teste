import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
// 👇 1. IMPORTANTE: Importar o componente visual do Sonner
import { Toaster } from "sonner"; 

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
        
        {/* 👇 2. ADICIONE ISSO AQUI: É o "alto-falante" das mensagens */}
        <Toaster 
          richColors 
          position="top-center" 
          theme="dark"
        />
        
      </body>
    </html>
  );
}