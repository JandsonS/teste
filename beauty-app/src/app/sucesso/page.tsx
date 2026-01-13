"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";

export default function SucessoPage() {
  // Pega os dados que o Mercado Pago devolve na URL
  const searchParams = useSearchParams();
  const paymentId = searchParams.get("payment_id");
  const status = searchParams.get("status");

  // Número da Rosana (coloque o real aqui com DDD)
  const whatsappNumber = "5587999999999"; 
  
  // Mensagem automática
  const message = `Olá! Acabei de fazer o pagamento do agendamento (ID: ${paymentId}). Podemos confirmar o horário?`;
  
  const whatsappLink = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;

  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-6 text-center">
      <div className="bg-zinc-900 p-8 rounded-2xl border border-green-500/30 max-w-md w-full">
        <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="text-3xl">✅</span>
        </div>
        
        <h1 className="text-2xl font-bold text-green-400 mb-2">Pagamento Aprovado!</h1>
        <p className="text-zinc-400 mb-6">
          Seu agendamento está quase pronto. Envie o comprovante para confirmar o horário.
        </p>

        {/* Botão Mágico que notifica a dona */}
        <a 
          href={whatsappLink}
          target="_blank"
          className="block w-full bg-green-600 hover:bg-green-500 text-white font-bold py-3 rounded-xl transition-all mb-4"
        >
          Enviar Comprovante no WhatsApp
        </a>

        <Link href="/" className="text-zinc-500 hover:text-white text-sm underline">
          Voltar para o início
        </Link>
      </div>
    </div>
  );
}