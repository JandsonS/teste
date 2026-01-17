"use client";

import { useSearchParams, useRouter } from 'next/navigation';
import { useEffect, useState, Suspense } from 'react';
import { Check, MessageCircle, Home, Loader2, XCircle } from "lucide-react";
import { SITE_CONFIG } from "@/constants/info";

function SucessoContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const id = searchParams.get('id');

  const [status, setStatus] = useState("VERIFICANDO"); 
  const [dados, setDados] = useState<any>(null);

  const checkStatus = async () => {
    if (!id) return;
    try {
      // Chama o nosso verificador TURBO
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
      console.error("Erro status");
    }
  };

  useEffect(() => {
    if (!id) return;
    checkStatus();
    // Verifica a cada 3 segundos
    const interval = setInterval(checkStatus, 3000);
    return () => clearInterval(interval);
  }, [id]);

  return (
    <div className="min-h-screen bg-[#050505] text-white flex flex-col items-center justify-center p-4 text-center">
        {/* TELA VERDE (PAGO) */}
        {(status === 'PAGO' || status === 'AGENDADO_LOCAL') && (
          <div className="flex flex-col items-center animate-fade-in-up">
            <div className="w-24 h-24 bg-green-500/10 rounded-full flex items-center justify-center mb-6 border border-green-500/20">
                <Check className="text-green-500 w-10 h-10" />
            </div>
            <h1 className="text-3xl font-bold mb-2">Agendamento Confirmado!</h1>
            <p className="text-zinc-400 mb-6">Tudo certo, <strong>{dados?.cliente}</strong>.</p>
            <a href="/" className="bg-zinc-800 py-3 px-8 rounded-xl font-bold border border-zinc-700">Voltar ao Início</a>
          </div>
        )}

        {/* TELA AMARELA (PROCESSANDO) */}
        {(status === 'PENDENTE' || status === 'VERIFICANDO') && (
            <div className="flex flex-col items-center animate-pulse">
                <Loader2 className="w-16 h-16 text-yellow-500 animate-spin mb-6" />
                <h1 className="text-2xl font-bold mb-2">Verificando Pagamento...</h1>
                <p className="text-zinc-400">Aguarde, estamos confirmando com o banco.</p>
            </div>
        )}
    </div>
  );
}

export default function SucessoPage() {
  return (
    <Suspense fallback={<div className="text-white text-center mt-10">Carregando...</div>}>
      <SucessoContent />
    </Suspense>
  );
}