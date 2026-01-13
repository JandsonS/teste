"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState, Suspense } from "react";

// 1. Criamos um componente interno só para o conteúdo que precisa da URL
function ConteudoSucesso() {
  const searchParams = useSearchParams();
  const paymentId = searchParams.get("payment_id");
  const [whatsappLink, setWhatsappLink] = useState("#");

  const whatsappNumber = "558791537080"; // SEU NÚMERO AQUI

  useEffect(() => {
    const savedData = localStorage.getItem("agendamentoTemp");
    let message = "";
    
    if (savedData) {
      const { service, date, time, client } = JSON.parse(savedData);
      message = `✅ *Pagamento Confirmado!*\n\nOlá, sou *${client}*.\nAcabei de pagar o agendamento (ID: ${paymentId || 'N/A'}).\n\n📌 *Serviço:* ${service}\n📅 *Data:* ${date}\n⏰ *Horário:* ${time}\n\nPodemos confirmar?`;
    } else {
      message = `Olá! Acabei de fazer o pagamento do agendamento (ID: ${paymentId || 'N/A'}). Podemos confirmar o horário?`;
    }

    setWhatsappLink(`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`);
  }, [paymentId]);

  return (
    <div className="bg-zinc-900 p-8 rounded-2xl border border-green-500/30 max-w-md w-full animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-green-500/20">
        <span className="text-4xl">🎉</span>
      </div>
      
      <h1 className="text-2xl font-bold text-green-400 mb-2">Tudo Certo!</h1>
      <p className="text-zinc-400 mb-8 leading-relaxed">
        Seu pagamento foi recebido. Para finalizar, clique no botão abaixo e confirme o horário no WhatsApp.
      </p>

      <a 
        href={whatsappLink}
        target="_blank"
        className="block w-full bg-green-600 hover:bg-green-500 text-white font-bold py-4 rounded-xl transition-all shadow-lg hover:shadow-green-500/20 hover:-translate-y-1"
      >
        Confirmar Agendamento no WhatsApp
      </a>

      <Link href="/" className="block mt-6 text-zinc-600 hover:text-white text-sm underline transition-colors">
        Voltar para o início
      </Link>
    </div>
  );
}

// 2. O componente principal apenas "segura" o conteúdo com Suspense
export default function SucessoPage() {
  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-6 text-center">
      <Suspense fallback={<p className="text-zinc-500">Carregando confirmação...</p>}>
        <ConteudoSucesso />
      </Suspense>
    </div>
  );
}