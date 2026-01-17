"use client";

import { useSearchParams, useRouter } from 'next/navigation';
import { useEffect, useState, Suspense } from 'react';
import { initMercadoPago, StatusScreen } from '@mercadopago/sdk-react';
import { Home, Loader2 } from "lucide-react";

// SUA CHAVE PÚBLICA (Do seu print anterior)
initMercadoPago('APP_USR-4cc1a345-aa8e-4a5f-aef9-ffaa7bb2d3f1'); 

function PixScreenContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const paymentId = searchParams.get('paymentId');

  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (paymentId) {
        setReady(true);
    } else {
        router.push('/');
    }
  }, [paymentId, router]);

  if (!ready) {
    return (
        <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center text-white">
            <Loader2 className="w-10 h-10 animate-spin text-pink-500 mb-4" />
            <p>Carregando pagamento...</p>
        </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-lg overflow-hidden shadow-2xl">
        
        {/* 🧱 O BRICK DO MERCADO PAGO */}
        <StatusScreen
          initialization={{ paymentId: paymentId! }}
          customization={{
            visual: {
              hideStatusDetails: false,
              hideTransactionDate: false,
              style: {
                theme: 'bootstrap', 
              }
            },
            backUrls: {
                return: 'https://teste-drab-rho-60.vercel.app/' // <--- CORRIGIDO: O nome certo é 'return'
            }
          }}
          onReady={() => console.log('Brick pronto!')}
          onError={(error) => console.error('Erro no Brick:', error)}
        />

      </div>

      <button 
        onClick={() => router.push('/')}
        className="mt-8 flex items-center gap-2 text-zinc-400 hover:text-white transition py-3 px-6 rounded-lg border border-zinc-800 hover:bg-zinc-900"
      >
        <Home size={20} />
        Voltar ao Início
      </button>
    </div>
  );
}

export default function PixPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-black text-white flex items-center justify-center">Carregando...</div>}>
      <PixScreenContent />
    </Suspense>
  );
}