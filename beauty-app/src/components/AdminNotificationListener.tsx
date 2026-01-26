"use client";

import { useEffect, useState } from "react";
import { Download, Share, PlusSquare, X, Smartphone } from "lucide-react";
import { toast } from "sonner";

export default function InstallPrompt() {
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isOpen, setIsOpen] = useState(false); // Controla se o manual está aberto

  useEffect(() => {
    // 1. Verifica se já está instalado
    const isInStandaloneMode = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone;
    setIsStandalone(isInStandaloneMode);

    // 2. Detecta iPhone
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIosDevice);

    // 3. Captura o evento do Android (Crucial!)
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      // Não abrimos automático para não ser invasivo, deixamos o botão aparecer
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    return () => window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
  }, []);

  const handleInstallClick = async () => {
    // Se for Android e tivermos o evento capturado
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
        setIsOpen(false);
      }
    } 
    // Se for iPhone, apenas abre as instruções
    else if (isIOS) {
      setIsOpen(true);
    } 
    // Se não tiver evento (ex: PC ou Android que já bloqueou), avisa
    else {
      toast.info("Para instalar: Clique nos 3 pontinhos do navegador e 'Adicionar à Tela Inicial'");
    }
  };

  // Se já estiver instalado (Modo App), não mostra nada
  if (isStandalone) return null;

  return (
    <>
      {/* 1. BOTÃO FLUTUANTE FIXO (Aparece ao lado do sino) */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-20 right-5 z-40 p-3 rounded-full shadow-lg border bg-zinc-800 text-zinc-200 border-zinc-700 hover:bg-zinc-700 hover:text-white transition-all hover:scale-110"
        title="Instalar Aplicativo"
      >
        <Smartphone size={20} />
      </button>

      {/* 2. O CARD DE INSTRUÇÕES (Só aparece se clicar no botão) */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-zinc-900 border border-emerald-500/30 p-6 rounded-2xl shadow-2xl max-w-sm w-full relative">
            
            <button 
              onClick={() => setIsOpen(false)}
              className="absolute top-3 right-3 text-zinc-500 hover:text-white"
              aria-label="Fechar"
            >
              <X size={20} />
            </button>

            <div className="flex flex-col items-center text-center gap-4">
              <div className="bg-emerald-500/20 p-4 rounded-full text-emerald-500 mb-2">
                <Download size={32} />
              </div>
              
              <h3 className="font-bold text-white text-lg">Instalar App Admin</h3>
              
              {isIOS ? (
                // INSTRUÇÃO IPHONE
                <div className="text-sm text-zinc-400 space-y-3 bg-zinc-950/50 p-4 rounded-xl w-full text-left">
                  <p>No iPhone, a instalação é manual:</p>
                  <div className="flex items-center gap-2 text-white">
                    1. Toque em <Share size={16} className="text-blue-500" /> <strong>Compartilhar</strong>
                  </div>
                  <div className="flex items-center gap-2 text-white">
                    2. Role e escolha <PlusSquare size={16} /> <strong>Adicionar à Tela de Início</strong>
                  </div>
                </div>
              ) : deferredPrompt ? (
                // BOTÃO ANDROID (Se disponível)
                <div className="space-y-3 w-full">
                  <p className="text-sm text-zinc-400">
                    Instale para ter notificações em tela cheia e acesso rápido.
                  </p>
                  <button 
                    onClick={handleInstallClick}
                    className="bg-emerald-500 hover:bg-emerald-400 text-black font-bold py-3 px-4 rounded-xl w-full transition-colors flex items-center justify-center gap-2"
                  >
                    <Download size={18} />
                    Confirmar Instalação
                  </button>
                </div>
              ) : (
                // FALLBACK (Se o navegador não deixar instalar auto)
                <div className="text-sm text-zinc-400 bg-zinc-800/50 p-3 rounded-lg">
                  <p>Seu navegador não permitiu a instalação automática.</p>
                  <p className="mt-2 text-white font-medium">Toque no menu do navegador (⋮) e procure por "Instalar aplicativo" ou "Adicionar à tela inicial".</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}