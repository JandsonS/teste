"use client";

import { useEffect, useState } from "react";
import { Download, Share, PlusSquare, X } from "lucide-react";

export default function InstallPrompt() {
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    // 1. Verifica se já está instalado
    const isInStandaloneMode = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone;
    setIsStandalone(isInStandaloneMode);

    // 2. Detecta se é iPhone
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIosDevice);

    // 3. Captura o evento do Android
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      if (!isInStandaloneMode) {
        setShowPrompt(true);
      }
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    // Se for iPhone, mostra aviso depois de 3 seg
    if (isIosDevice && !isInStandaloneMode) {
      setTimeout(() => setShowPrompt(true), 3000);
    }

    return () => window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setShowPrompt(false);
    }
    setDeferredPrompt(null);
  };

  if (isStandalone || !showPrompt) return null;

  return (
    <div className="fixed bottom-20 left-4 right-4 z-50 animate-in slide-in-from-bottom-5 fade-in duration-500">
      <div className="bg-zinc-900 border border-emerald-500/30 p-4 rounded-2xl shadow-2xl relative">
        <button 
                onClick={() => setShowPrompt(false)}
                className="absolute top-2 right-2 text-zinc-500 hover:text-white p-1"
                 aria-label="Fechar aviso de instalação" // <--- ADICIONE ISSO
                 title="Fechar" // <--- E ISSO
>
            <X size={16} />
            </button>

        <div className="flex items-start gap-4">
          <div className="bg-emerald-500/20 p-3 rounded-xl text-emerald-500">
            <Download size={24} />
          </div>
          
          <div className="flex-1">
            <h3 className="font-bold text-white text-sm mb-1">Instalar App</h3>
            
            {isIOS ? (
              <div className="text-xs text-zinc-400 space-y-2">
                <p>Para instalar no iPhone:</p>
                <div className="flex items-center gap-2">
                  1. Toque em <Share size={12} className="text-blue-500" /> Compartilhar
                </div>
                <div className="flex items-center gap-2">
                  2. Escolha <PlusSquare size={12} /> <strong>Adicionar à Tela de Início</strong>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-xs text-zinc-400">
                  Instale para notificações em tela cheia.
                </p>
                <button 
                  onClick={handleInstallClick}
                  className="bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-bold py-2 px-4 rounded-lg w-full transition-colors"
                >
                  Instalar Agora
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}