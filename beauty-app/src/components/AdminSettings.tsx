"use client";
import { useState, useEffect } from "react";
import { Settings, X, Loader2, BellRing, BellOff, ChevronDown } from "lucide-react";
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
  const [isSaving, setIsSaving] = useState(false);
  const [config, setConfig] = useState({
    porcentagemSinal: 50,
    precoServico: 1.0
  });

  // Busca Configurações do Banco
  const fetchConfig = async () => {
    try {
      const res = await fetch("/api/admin/config");
      const data = await res.json();
      if (data && !data.error) setConfig(data);
    } catch (error) {
      console.error("Erro ao carregar configurações");
    }
  };

  // Salva Regras de Negócio (Porcentagem de Sinal)
  const handleSaveRules = async () => {
    setIsSaving(true);
    try {
      const res = await fetch("/api/admin/config", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });
      if (res.ok) {
        toast.success("Regras de sinal atualizadas! 🎯");
      }
    } catch (error) {
      toast.error("Erro ao salvar regras.");
    } finally {
      setIsSaving(false);
    }
  };

  // Verifica subscrição push ao carregar
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.ready.then((reg) => {
        reg.pushManager.getSubscription().then((sub) => {
          if (sub) setIsSubscribed(true);
        });
      });
    }
    fetchConfig();
  }, []);

  const toggleSubscription = async () => {
    setLoading(true);
    try {
      if (!("serviceWorker" in navigator)) {
        toast.error("Navegador sem suporte a notificações.");
        return;
      }

      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();

      if (sub) {
        await sub.unsubscribe();
        setIsSubscribed(false);
        toast.success("Notificações desativadas.");
      } else {
        const newSub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!)
        });

        await fetch("/api/push/subscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(newSub),
        });

        setIsSubscribed(true);
        toast.success("Notificações ativadas! 🚀");
      }
    } catch (error) {
      toast.error("Erro nas permissões de notificação.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Botão Flutuante (Correção Acessibilidade: aria-label e title) */}
      <button 
        onClick={() => setIsOpen(true)}
        title="Abrir Configurações do Sistema"
        aria-label="Abrir Configurações"
        className="fixed bottom-4 right-4 bg-zinc-900 text-white p-3 rounded-full shadow-lg border border-zinc-800 hover:bg-zinc-800 z-40 transition-all active:scale-95 group"
      >
        <Settings size={24} className="group-hover:rotate-90 transition-transform duration-500" />
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-950 border border-zinc-800 w-full max-w-sm rounded-[32px] p-8 shadow-2xl relative">
            
            {/* Botão Fechar (Correção Acessibilidade: aria-label e title) */}
            <button 
              onClick={() => setIsOpen(false)} 
              title="Fechar Janela"
              aria-label="Fechar"
              className="absolute top-6 right-6 text-zinc-500 hover:text-white transition-colors"
            >
              <X size={20} />
            </button>

            <h2 className="text-xl font-black text-white uppercase tracking-tighter mb-1">Painel de Controle</h2>
            <p className="text-zinc-500 text-[10px] uppercase font-bold tracking-widest mb-8">Configurações Gerais</p>

            <div className="space-y-8">
              {/* SEÇÃO 1: PORCENTAGEM DE SINAL */}
              <div className="space-y-3">
                <label htmlFor="porcentagemSinal" className="text-[10px] font-black uppercase text-zinc-400 tracking-widest ml-1">
                  Valor da Reserva (Sinal)
                </label>
                <div className="relative">
                  {/* Select (Correção Acessibilidade: title e id) */}
                  <select 
                    id="porcentagemSinal"
                    title="Selecione a porcentagem do sinal para reserva"
                    value={config.porcentagemSinal}
                    onChange={(e) => setConfig({...config, porcentagemSinal: Number(e.target.value)})}
                    className="w-full bg-black border border-white/5 rounded-2xl p-4 text-white text-sm outline-none focus:border-emerald-500 appearance-none transition-all cursor-pointer"
                  >
                    {[10, 20, 30, 40, 50, 60, 70].map(pct => (
                      <option key={pct} value={pct}>{pct}% do valor total</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
                </div>
                
                {/* Botão Salvar Regras (Correção Acessibilidade: title) */}
                <button 
                  onClick={handleSaveRules}
                  disabled={isSaving}
                  title="Salvar alterações de porcentagem"
                  className="w-full py-2 bg-emerald-600/10 text-emerald-500 rounded-xl text-[10px] font-black uppercase hover:bg-emerald-600/20 transition-all flex items-center justify-center gap-2"
                >
                  {isSaving && <Loader2 size={12} className="animate-spin" />}
                  {isSaving ? "Salvando..." : "Aplicar Nova Porcentagem"}
                </button>
              </div>

              {/* SEÇÃO 2: NOTIFICAÇÕES (O que já existia, agora integrado) */}
              <div className="pt-6 border-t border-white/5 space-y-4">
                <label className="text-[10px] font-black uppercase text-zinc-400 tracking-widest ml-1">Sistema de Alertas</label>
                <div className={`p-4 rounded-2xl border transition-all ${isSubscribed ? "bg-emerald-500/5 border-emerald-500/20" : "bg-zinc-900/50 border-zinc-800"}`}>
                   <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-white uppercase">Notificações Push</span>
                      {isSubscribed ? <BellRing size={16} className="text-emerald-500" /> : <BellOff size={16} className="text-zinc-600" />}
                   </div>
                   <p className="text-[9px] text-zinc-500 uppercase font-bold leading-relaxed">
                      {isSubscribed ? "Você será avisado sobre novos agendamentos em tempo real." : "Alertas desativados. Você não receberá avisos sonoros."}
                   </p>
                </div>

                <button
                  onClick={toggleSubscription}
                  disabled={loading}
                  title={isSubscribed ? "Desativar alertas sonoros" : "Ativar alertas sonoros"}
                  className={`w-full py-4 rounded-2xl font-black text-[10px] uppercase transition-all flex items-center justify-center gap-2 ${
                    isSubscribed ? "bg-zinc-800 text-zinc-400 hover:bg-zinc-700" : "bg-white text-black hover:bg-zinc-200"
                  }`}
                >
                  {loading && <Loader2 size={14} className="animate-spin" />}
                  {isSubscribed ? "Desativar Alertas" : "Ativar Alertas"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}