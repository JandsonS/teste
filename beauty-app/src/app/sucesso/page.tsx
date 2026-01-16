"use client";

import { Check, MessageCircle, Home } from "lucide-react";
import { SITE_CONFIG } from "@/constants/info";

export default function Sucesso() {
  return (
    <div className="min-h-screen bg-[#050505] text-white flex flex-col items-center justify-center p-4 text-center selection:bg-pink-500/30">
        
        {/* Ícone de Sucesso Animado */}
        <div className="w-24 h-24 bg-green-500/10 rounded-full flex items-center justify-center mb-6 border border-green-500/20 shadow-[0_0_30px_rgba(34,197,94,0.2)]">
            <Check className="text-green-500 w-10 h-10" />
        </div>

        <h1 className="text-3xl font-bold mb-2 bg-clip-text text-transparent bg-gradient-to-r from-white to-zinc-400">
            Agendamento Confirmado!
        </h1>
        
        <p className="text-zinc-400 max-w-md mb-10 leading-relaxed">
            Tudo certo! Seu horário já está reservado no nosso sistema.
            <br/>Se precisar alterar, entre em contato.
        </p>

        <div className="flex flex-col gap-3 w-full max-w-xs">
            {/* Botão WhatsApp */}
            <a 
                href={`https://wa.me/${SITE_CONFIG.whatsappNumber}?text=Olá, acabei de fazer um agendamento no site!`}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-green-600 hover:bg-green-500 text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-green-900/20"
            >
                <MessageCircle size={20} />
                Enviar Comprovante
            </a>

            {/* Botão Voltar */}
            <a 
                href="/"
                className="bg-zinc-800 hover:bg-zinc-700 text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all border border-zinc-700"
            >
                <Home size={20} />
                Voltar ao Início
            </a>
        </div>
        
        <div className="mt-12 text-zinc-600 text-sm">
            © {SITE_CONFIG.name}
        </div>
    </div>
  );
}