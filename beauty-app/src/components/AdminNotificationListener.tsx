"use client";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Bell } from "lucide-react";

// Função para converter a chave VAPID (obrigatória para funcionar)
function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/\-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export default function AdminNotificationListener() {
  const [isSubscribed, setIsSubscribed] = useState(false);

  // Verifica se já está inscrito ao carregar
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.ready.then((reg) => {
        reg.pushManager.getSubscription().then((sub) => {
          if (sub) setIsSubscribed(true);
        });
      });
    }
  }, []);

  const subscribeToPush = async () => {
    if (!("serviceWorker" in navigator)) return toast.error("Seu navegador não suporta Push");

    try {
      const reg = await navigator.serviceWorker.ready;
      
      // 1. Pede permissão e Inscreve no Push Manager do Navegador
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(
          process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!
        ),
      });

      // 2. Manda a inscrição para o nosso Banco de Dados
      await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sub),
      });

      setIsSubscribed(true);
      toast.success("Notificações em Segundo Plano Ativadas! 🚀");
      
      // Teste imediato
      new Notification("Configuração Concluída", {
        body: "Você receberá avisos mesmo com o app fechado.",
        icon: "/logo.png"
      });

    } catch (error) {
      console.error(error);
      toast.error("Erro ao ativar notificações. Verifique as permissões.");
    }
  };

  if (isSubscribed) return null; // Se já tá ativo, some o botão

  return (
    <div className="fixed top-4 right-4 z-50 animate-bounce">
      <button
        onClick={subscribeToPush}
        className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-3 rounded-full shadow-xl font-bold border-2 border-white"
      >
        <Bell size={20} />
        ATIVAR NOTIFICAÇÕES REAIS
      </button>
    </div>
  );
}