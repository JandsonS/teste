"use client";

import { useSearchParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Check, MessageCircle, Home, Loader2, XCircle } from "lucide-react";
import { SITE_CONFIG } from "@/constants/info";

export default function Sucesso() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const id = searchParams.get('id');

  // Estados da verificação
  const [status, setStatus] = useState("VERIFICANDO"); 
  const [dados, setDados] = useState<any>(null);

  // Função que vai no servidor perguntar: "E aí, já pagou?"
  const checkStatus = async () => {
    if (!id) return;

    try {
      const res = await fetch('/api/status', {
        method: 'POST',
        body: JSON.stringify({ id }),
      });
      const data = await res.json();

      if (data.status) {
        setDados(data);
        setStatus(data.status);
      }
    } catch (error) {
      console.error("Erro ao verificar status");
    }
  };

  useEffect(() => {
    // Se não tiver ID na URL, volta pra home
    if (!id) {
      router.push('/'); 
      return;
    }

    // 1. Verifica agora mesmo
    checkStatus();

    // 2. Cria um "timer" para verificar a cada 3 segundos
    const intervalo = setInterval(checkStatus, 3000);

    // Limpa o timer quando sair da página
    return () => clearInterval(intervalo);
  }, [id, router]);

  return (
    <div className="min-h-screen bg-[#050505] text-white flex flex-col items-center justify-center p-4 text-center selection:bg-pink-500/30">
        
        {/* ==========================================================
            CENÁRIO 1: SUCESSO / PAGO ✅ (Seu Layout Original)
           ========================================================== */}
        {(status === 'PAGO' || status === 'AGENDADO_LOCAL') && (
          <div className="animate-fade-in-up flex flex-col items-center">
            <div className="w-24 h-24 bg-green-500/10 rounded-full flex items-center justify-center mb-6 border border-green-500/20 shadow-[0_0_30px_rgba(34,197,94,0.2)]">
                <Check className="text-green-500 w-10 h-10" />
            </div>

            <h1 className="text-3xl font-bold mb-2 bg-clip-text text-transparent bg-gradient-to-r from-white to-zinc-400">
                Agendamento Confirmado!
            </h1>
            
            <p className="text-zinc-400 max-w-md mb-6 leading-relaxed">
                Tudo certo, <strong>{dados?.cliente}</strong>! <br/>
                Seu horário para <strong>{dados?.servico}</strong> está reservado:
            </p>

            <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 mb-8 w-full max-w-xs">
                 <p className="text-lg font-bold text-white">📅 {dados?.data}</p>
                 <p className="text-xl font-bold text-pink-500">⏰ {dados?.horario}</p>
            </div>

            <p className="text-zinc-500 text-sm max-w-md mb-8">
                Envie o comprovante via Whatsapp para agilizar seu atendimento.
            </p>

            <div className="flex flex-col gap-3 w-full max-w-xs">
                {/* Botão WhatsApp */}
                <a 
                    href={`https://wa.me/${SITE_CONFIG.whatsappNumber}?text=Olá, meu agendamento foi confirmado! Nome: ${dados?.cliente}, Dia: ${dados?.data} às ${dados?.horario}.`}
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
          </div>
        )}

        {/* ==========================================================
            CENÁRIO 2: CARREGANDO / VERIFICANDO ⏳ (Amarelo)
           ========================================================== */}
        {(status === 'PENDENTE' || status === 'VERIFICANDO') && (
            <div className="flex flex-col items-center animate-pulse">
                <div className="w-24 h-24 bg-yellow-500/10 rounded-full flex items-center justify-center mb-6 border border-yellow-500/20">
                    <Loader2 className="text-yellow-500 w-10 h-10 animate-spin" />
                </div>
                <h1 className="text-2xl font-bold mb-2 text-white">Verificando Pagamento...</h1>
                <p className="text-zinc-400 max-w-xs mb-8">
                    Aguarde um momento enquanto confirmamos a transação com o banco. Não feche esta tela.
                </p>
                <div className="w-64 h-2 bg-zinc-800 rounded-full overflow-hidden">
                    <div className="h-full bg-yellow-500 w-full animate-progress origin-left"></div>
                </div>
            </div>
        )}

        {/* ==========================================================
            CENÁRIO 3: CANCELADO / ERRO ❌ (Vermelho)
           ========================================================== */}
        {status === 'CANCELADO' && (
            <div className="flex flex-col items-center">
                <div className="w-24 h-24 bg-red-500/10 rounded-full flex items-center justify-center mb-6 border border-red-500/20">
                    <XCircle className="text-red-500 w-10 h-10" />
                </div>
                <h1 className="text-2xl font-bold mb-2 text-white">Pagamento Não Identificado</h1>
                <p className="text-zinc-400 max-w-md mb-8">
                    O tempo limite expirou ou o pagamento foi cancelado. Por favor, tente reservar novamente.
                </p>
                <a 
                    href="/"
                    className="bg-zinc-800 hover:bg-zinc-700 text-white py-4 px-8 rounded-xl font-bold flex items-center justify-center gap-2 transition-all border border-zinc-700 w-full max-w-xs"
                >
                    <Home size={20} />
                    Tentar Novamente
                </a>
            </div>
        )}

        <div className="mt-12 text-zinc-600 text-sm">
            © {SITE_CONFIG.name}
        </div>
    </div>
  );
}