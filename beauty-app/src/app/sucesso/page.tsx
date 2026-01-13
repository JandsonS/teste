"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState, Suspense } from "react";

// 1. Criamos um componente interno só para o conteúdo que precisa da URL
function ConteudoSucesso() {
  const searchParams = useSearchParams();
  const paymentId = searchParams.get("payment_id");
  const [whatsappLink, setWhatsappLink] = useState("#");

  const whatsappNumber = "5587991537080"; // SEU NÚMERO AQUI


  useEffect(() => {
    const savedData = localStorage.getItem("agendamentoTemp");
    let message = "";
    
    if (savedData) {
      const { service, date, time, client } = JSON.parse(savedData);
      
      // MENSAGEM ORGANIZADA (Com Status PAGO)
      message = `*AGENDAMENTO CONFIRMADO* ✅
_________________________

👤 *Cliente:* ${client}
✂️ *Serviço:* ${service}
✅ *Status:* PAGO (ID: ${paymentId || 'N/A'})

📅 *Data:* ${date}
⏰ *Horário:* ${time}
_________________________
*Podemos confirmar este horário?*`;

    } else {
      // Caso genérico (se perder os dados do navegador)
      message = `*PAGAMENTO RECEBIDO* ✅
_________________________
ID do Pagamento: ${paymentId || 'N/A'}

Olá! Fiz o pagamento pelo site e gostaria de confirmar o horário.`;
    }

    setWhatsappLink(`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`);
  }, [paymentId]);

  return (
    // ... (Mantenha o HTML visual igual ao anterior) ...
    <div className="bg-zinc-900 p-8 rounded-2xl border border-green-500/30 max-w-md w-full animate-in fade-in slide-in-from-bottom-4 duration-700">
       {/* ... resto do HTML ... */}
      <h1 className="text-2xl font-bold text-green-400 mb-2">Tudo Certo!</h1>
      <p className="text-zinc-400 mb-8 leading-relaxed">
        Seu pagamento foi aprovado! Clique abaixo para enviar o comprovante oficial ao profissional.
      </p>

      <a 
        href={whatsappLink}
        target="_blank"
        className="block w-full bg-green-600 hover:bg-green-500 text-white font-bold py-4 rounded-xl transition-all shadow-lg hover:shadow-green-500/20 hover:-translate-y-1"
      >
        Finalizar no WhatsApp
      </a>
      {/* ... */}
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