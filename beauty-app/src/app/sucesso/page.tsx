"use client";

import { useSearchParams, useRouter } from 'next/navigation';
import { useEffect, useState, Suspense } from 'react';
import { Check, Loader2, RefreshCcw, Home } from "lucide-react";
import { SITE_CONFIG } from "@/constants/info"; // Certifique-se que esse import existe ou remova

function SucessoContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const id = searchParams.get('id');

  const [status, setStatus] = useState("VERIFICANDO"); 
  const [dados, setDados] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const checkStatus = async () => {
    if (!id) return;
    setLoading(true); // Mostra que está tentando
    try {
      const res = await fetch('/api/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      
      if (!res.ok) throw new Error('Falha na comunicação');

      const data = await res.json();
      if (data.status) {
        setDados(data);
        setStatus(data.status);
      }
    } catch (error) {
      console.error("Erro ao verificar status");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!id) {
        router.push('/');
        return;
    }
    checkStatus();
    // Tenta sozinho a cada 5 segundos
    const interval = setInterval(checkStatus, 5000);
    return () => clearInterval(interval);
  }, [id, router]);

  return (
    <div className="min-h-screen bg-[#050505] text-white flex flex-col items-center justify-center p-4 text-center">
        
        {/* CENÁRIO 1: PAGO / SUCESSO ✅ */}
        {(status === 'PAGO' || status === 'AGENDADO_LOCAL') && (
          <div className="flex flex-col items-center animate-fade-in-up">
            <div className="w-24 h-24 bg-green-500/10 rounded-full flex items-center justify-center mb-6 border border-green-500/20 shadow-[0_0_30px_rgba(34,197,94,0.3)]">
                <Check className="text-green-500 w-10 h-10" />
            </div>
            <h1 className="text-3xl font-bold mb-2">Agendamento Confirmado!</h1>
            <p className="text-zinc-400 mb-6">
                Tudo certo, <strong>{dados?.cliente}</strong>.<br/>
                Seu horário: {dados?.data} às {dados?.horario}
            </p>
            <a href="/" className="bg-zinc-800 hover:bg-zinc-700 py-3 px-8 rounded-xl font-bold border border-zinc-700 transition">
                Voltar ao Início
            </a>
          </div>
        )}

        {/* CENÁRIO 2: AINDA VERIFICANDO ⏳ */}
        {(status === 'PENDENTE' || status === 'VERIFICANDO') && (
            <div className="flex flex-col items-center">
                <div className="relative mb-8">
                    <div className="w-20 h-20 border-4 border-zinc-800 rounded-full"></div>
                    <div className="absolute top-0 left-0 w-20 h-20 border-4 border-yellow-500 rounded-full border-t-transparent animate-spin"></div>
                </div>
                
                <h1 className="text-2xl font-bold mb-2">Verificando Pagamento...</h1>
                <p className="text-zinc-400 max-w-xs mb-8">
                    Estamos confirmando a transação com o banco. Isso pode levar alguns segundos.
                </p>

                {/* BOTÃO DE FORÇAR VERIFICAÇÃO */}
                <button 
                    onClick={checkStatus}
                    disabled={loading}
                    className="flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 py-3 px-6 rounded-lg text-sm font-bold transition border border-zinc-700"
                >
                    {loading ? <Loader2 className="animate-spin w-4 h-4"/> : <RefreshCcw className="w-4 h-4"/>}
                    Já Paguei (Atualizar Agora)
                </button>
            </div>
        )}
    </div>
  );
}

export default function SucessoPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-black flex items-center justify-center text-white">Carregando...</div>}>
      <SucessoContent />
    </Suspense>
  );
}