"use client";
import { useState, useEffect } from "react";
import { Settings, X, Loader2 } from "lucide-react";
import { toast } from "sonner";

// Função auxiliar para converter a chave VAPID
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

export default function AdminSettings() {
  const [isOpen, setIsOpen] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);

  // Verifica se já está inscrito ao abrir
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.ready.then((reg) => {
        reg.pushManager.getSubscription().then((sub) => {
          if (sub) setIsSubscribed(true);
        });
      });
    }
  }, []);

  const toggleSubscription = async () => {
    setLoading(true);
    try {
      if (!("serviceWorker" in navigator)) {
        toast.error("Seu navegador não suporta notificações.");
        return;
      }

      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();

      if (sub) {
        // SE JÁ TIVER: DESATIVAR
        await sub.unsubscribe();
        setIsSubscribed(false);
        toast.success("Notificações desativadas.");
      } else {
        // SE NÃO TIVER: ATIVAR
        const newSub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!)
        });

        // Salva no Banco de Dados
        await fetch("/api/push/subscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(newSub),
        });

        setIsSubscribed(true);
        toast.success("Notificações ativadas! 🚀");
      }
    } catch (error) {
      console.error(error);
      toast.error("Erro ao alterar notificações. Verifique as permissões.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Botão Flutuante de Engrenagem (Discreto) */}
      <button 
        onClick={() => setIsOpen(true)}
        aria-label="Abrir Configurações"
        className="fixed bottom-4 right-4 bg-zinc-900 text-white p-3 rounded-full shadow-lg border border-zinc-800 hover:bg-zinc-800 z-40 transition-all active:scale-95"
      >
        <Settings size={24} />
      </button>

      {/* Modal Limpo */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-zinc-950 border border-zinc-800 w-full max-w-sm rounded-2xl p-6 shadow-2xl relative">
            
            {/* Botão Fechar */}
            <button 
              onClick={() => setIsOpen(false)}
              aria-label="Fechar"
              className="absolute top-4 right-4 text-zinc-500 hover:text-white transition-colors"
            >
              <X size={24} />
            </button>

            <h2 className="text-lg font-bold text-white mb-1">Configurações</h2>
            <p className="text-zinc-500 text-xs mb-6">Gerencie os alertas do painel.</p>

            {/* STATUS DA NOTIFICAÇÃO (Sem ícone feio) */}
            <div className="mb-6">
                <p className="text-xs font-bold uppercase tracking-wider text-zinc-500 mb-2">Status do Push</p>
                <div className={`p-4 rounded-xl border flex flex-col gap-1 transition-all ${
                    isSubscribed 
                    ? "bg-emerald-500/5 border-emerald-500/20" 
                    : "bg-zinc-900 border-zinc-800"
                }`}>
                    <span className={`text-sm font-bold ${isSubscribed ? "text-emerald-400" : "text-zinc-400"}`}>
                        {isSubscribed ? "● Ativo e Operante" : "○ Desativado"}
                    </span>
                    <span className="text-xs text-zinc-500">
                        {isSubscribed 
                         ? "Você receberá avisos sonoros a cada novo agendamento." 
                         : "Você não será avisado sobre novos clientes."}
                    </span>
                </div>
            </div>
              
            {/* BOTÃO DE AÇÃO */}
            <button
              onClick={toggleSubscription}
              disabled={loading}
              className={`w-full py-3 px-4 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${
                isSubscribed 
                  ? "bg-red-500/10 text-red-500 hover:bg-red-500/20 border border-red-500/20" 
                  : "bg-white text-black hover:bg-zinc-200 shadow-lg shadow-white/10"
              }`}
            >
              {loading && <Loader2 size={16} className="animate-spin" />}
              {loading ? "Processando..." : isSubscribed ? "Desativar Notificações" : "Ativar Notificações"}
            </button>

          </div>
        </div>
      )}
    </>
  );
}