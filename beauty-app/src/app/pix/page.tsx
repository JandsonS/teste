"use client";

import { useSearchParams, useRouter } from 'next/navigation';
import { useEffect, useState, Suspense } from 'react';
import { StatusScreen } from '@mercadopago/sdk-react'; // <--- O Componente Mágico
import { Home } from "lucide-react";

// Coloque aqui sua CHAVE PÚBLICA do Mercado Pago (começa com APP_USR-...)
// Você pega ela no painel de desenvolvedor, logo abaixo do Access Token
const MP_PUBLIC_KEY = "SUA_PUBLIC_KEY_AQUI"; 

function PixScreenContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const paymentId = searchParams.get('paymentId');

  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (paymentId) setReady(true);
  }, [paymentId]);

  if (!ready) return <div className="text-white text-center mt-10">Carregando pagamento...</div>;

  return (
    <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-lg overflow-hidden shadow-2xl">
        
        {/* AQUI ESTÁ O BRICK: Ele faz tudo sozinho! Mostra QR Code e Tela Verde */}
        <StatusScreen
          initialization={{ paymentId: paymentId! }}
          onReady={() => console.log('Brick pronto!')}
          onError={(error) => console.error('Erro no Brick:', error)}
        />

      </div>

      <button 
        onClick={() => router.push('/')}
        className="mt-8 flex items-center gap-2 text-zinc-400 hover:text-white transition"
      >
        <Home size={20} />
        Voltar ao Início
      </button>
    </div>
  );
}

export default function PixPage() {
  return (
    <Suspense fallback={<div>Carregando...</div>}>
      <PixScreenContent />
    </Suspense>
  );
}