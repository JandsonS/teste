"use client";
import { useState, useEffect } from "react";
import { Settings, Volume2, X, Bell, BellOff, CheckCircle2 } from "lucide-react";
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
  const [selectedSound, setSelectedSound] = useState("/alert.mp3");
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);

  // Carrega configurações ao abrir
  useEffect(() => {
    const saved = localStorage.getItem("admin-sound");
    if (saved) setSelectedSound(saved);

    // Verifica se já está inscrito no Push
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
        // SE JÁ TIVER: DESATIVAR (Remove do Banco e do Navegador)
        // Opcional: Chamar API para remover do banco se quiser ser estrito
        await sub.unsubscribe();
        setIsSubscribed(false);
        toast.success("Notificações desativadas.");
      } else {
        // SE NÃO TIVER: ATIVAR
        const newSub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!)
        });

        // Salva no Banco
        await fetch("/api/push/subscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(newSub),
        });

        setIsSubscribed(true);
        toast.success("Notificações ativadas com sucesso! 🚀");
        
        // Toca o som para confirmar
        new Audio(selectedSound).play().catch(() => {});
      }
    } catch (error) {
      console.error(error);
      toast.error("Erro ao alterar notificações. Verifique as permissões.");
    } finally {
      setLoading(false);
    }
  };

  const saveSound = (sound: string) => {
    setSelectedSound(sound);
    localStorage.setItem("admin-sound", sound);
    const audio = new Audio(sound);
    audio.play().catch(() => {});
  };

  return (
    <>
      {/* Botão Flutuante Discreto */}
      <button 
        onClick={() => setIsOpen(true)}
        aria-label="Abrir Configurações"
        className="fixed bottom-4 right-4 bg-zinc-900 text-white p-3 rounded-full shadow-lg border border-zinc-700 hover:bg-zinc-800 z-40 transition-all active:scale-95"
      >
        <Settings size={24} />
      </button>

      {/* Modal */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-zinc-950 border border-zinc-800 w-full max-w-md rounded-2xl p-6 shadow-2xl relative">
            
            <button 
              onClick={() => setIsOpen(false)}
              aria-label="Fechar"
              className="absolute top-4 right-4 text-zinc-500 hover:text-white transition-colors"
            >
              <X size={24} />
            </button>

            <h2 className="text-xl font-bold text-white mb-1">Configurações</h2>
            <p className="text-zinc-500 text-sm mb-6">Personalize sua experiência no painel.</p>

            {/* SEÇÃO 1: NOTIFICAÇÕES (O que você pediu) */}
            <div className="mb-8 p-4 rounded-xl bg-zinc-900/50 border border-zinc-800">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${isSubscribed ? 'bg-emerald-500/20 text-emerald-500' : 'bg-zinc-800 text-zinc-400'}`}>
                    {isSubscribed ? <Bell size={20} /> : <BellOff size={20} />}
                  </div>
                  <div>
                    <h3 className="text-white font-medium">Notificações Push</h3>
                    <p className="text-xs text-zinc-500">
                      {isSubscribed ? "Ativo: Você receberá avisos." : "Desativado: Você não será avisado."}
                    </p>
                  </div>
                </div>
              </div>
              
              <button
                onClick={toggleSubscription}
                disabled={loading}
                className={`w-full mt-3 py-2 px-4 rounded-lg font-medium text-sm transition-all flex items-center justify-center gap-2 ${
                  isSubscribed 
                    ? "bg-red-500/10 text-red-500 hover:bg-red-500/20 border border-red-500/20" 
                    : "bg-emerald-600 text-white hover:bg-emerald-700 shadow-lg shadow-emerald-900/20"
                }`}
              >
                {loading ? "Processando..." : isSubscribed ? "Desativar Notificações" : "Ativar Notificações"}
              </button>
            </div>

            {/* SEÇÃO 2: SONS */}
            <div className="space-y-3">
              <label className="text-zinc-400 text-xs font-bold uppercase tracking-wider ml-1">
                Som do Alerta
              </label>
              
              <div className="grid gap-2">
                {[
                  { name: "🔔 Clássico", file: "/alert.mp3" },
                  // { name: "💰 Moeda", file: "/coins.mp3" }, // Descomente se tiver o arquivo
                ].map((sound) => (
                  <button
                    key={sound.file}
                    onClick={() => saveSound(sound.file)}
                    className={`flex items-center justify-between p-3 rounded-lg border text-sm transition-all ${
                      selectedSound === sound.file
                        ? "bg-zinc-800 border-zinc-600 text-white"
                        : "bg-transparent border-transparent text-zinc-400 hover:bg-zinc-900"
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <Volume2 size={16} />
                      {sound.name}
                    </span>
                    {selectedSound === sound.file && <CheckCircle2 size={16} className="text-emerald-500" />}
                  </button>
                ))}
              </div>
            </div>

          </div>
        </div>
      )}
    </>
  );
}