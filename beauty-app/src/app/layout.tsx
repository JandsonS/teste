import type { Metadata } from "next";
import { Inter } from "next/font/google"; // Importando uma fonte bonita
import "./globals.css";

// Configurando a fonte
const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Rosana Sena Beauty",
  description: "Agende seu horário",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className="dark">
      <body className={`${inter.className} bg-zinc-950 text-zinc-100 antialiased selection:bg-pink-500/30`}>
        {/* Adiciona um efeito de luz de fundo sutil */}
        <div className="fixed inset-0 -z-10 h-full w-full bg-zinc-950 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(236,72,153,0.15),rgba(255,255,255,0))]"></div>
        {children}
      </body>
    </html>
  );
}