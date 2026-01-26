"use client";
import { useEffect, useRef } from "react";
import { toast } from "sonner";

export default function AdminNotificationListener() {
  const wakeLockRef = useRef<any>(null);

  // Mantém a tela ligada (Opcional, mas recomendado para Painel)
  useEffect(() => {
    const requestWakeLock = async () => {
      try {
        if ('wakeLock' in navigator) {
          wakeLockRef.current = await (navigator as any).wakeLock.request('screen');
        }
      } catch (err) {
        console.log("Wake Lock não suportado ou bloqueado (sem problemas).");
      }
    };

    // Tenta ativar ao carregar e ao voltar para a aba
    requestWakeLock();
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') requestWakeLock();
    });

    return () => {
      if (wakeLockRef.current) wakeLockRef.current.release();
    };
  }, []);

  // Este componente agora é invisível, não renderiza botão nenhum.
  return null; 
}