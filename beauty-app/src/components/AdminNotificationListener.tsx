"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Bell, BellOff, Calendar, Clock, Lock } from "lucide-react";

export default function AdminNotificationListener() {
  const [isMuted, setIsMuted] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>("default");
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const lastSeenIdRef = useRef<string | null>(null);
  const isUnlockedRef = useRef(false);

  // 1. Inicialização
  useEffect(() => {
    // Carrega preferência de mudo
    const savedPreference = localStorage.getItem("admin_sound_muted");
    if (savedPreference === "true") setIsMuted(true);
    
    // Carrega audio
    audioRef.current = new Audio("/alert.mp3");

    // Verifica permissão de notificação do sistema
    if ("Notification" in window) {
      setPermission(Notification.permission);
    }
  }, []);

  // 2. Solicitar Permissão
  const requestNotificationAccess = async () => {
    if (!("Notification" in window)) return;
    
    const result = await Notification.requestPermission();
    setPermission(result);
    
    if (result === "granted") {
      toast.success("Notificações de Sistema Ativadas! 📱");
      enableWakeLock();
    }
  };

  // 3. Wake Lock (Modo Quiosque)
  const enableWakeLock = async () => {
    try {
      if ("wakeLock" in navigator) {
        await navigator.wakeLock.request('screen');
        console.log("💡 Tela mantida ligada (Wake Lock ativo)");
      }
    } catch (err) {
      console.log("Wake Lock não suportado ou negado");
    }
  };

  // 4. Função de envio de Notificação Nativa (CORRIGIDA)
  const sendSystemNotification = (cliente: string, servico: string) => {
    if (Notification.permission === "granted") {
      
      // A CORREÇÃO ESTÁ AQUI:
      // Chamamos a vibração separadamente para evitar o erro do TypeScript
      if (navigator.vibrate) {
        navigator.vibrate([200, 100, 200]);
      }

      const notif = new Notification(`Novo: ${cliente}`, {
        body: `${servico} - Toque para abrir`,
        icon: "/icon.png", 
        tag: "novo-agendamento",
        // removemos a linha 'vibrate' daqui de dentro
      });

      notif.onclick = () => {
        window.focus();
        window.location.reload();
      };
    }
  };

  // 5. Destravar Audio
  useEffect(() => {
    const unlockAudio = () => {
      if (isUnlockedRef.current) return;
      if (audioRef.current) {
        audioRef.current.play().catch(() => {});
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
        isUnlockedRef.current = true;
      }
      enableWakeLock();
    };

    document.addEventListener("click", unlockAudio);
    document.addEventListener("touchstart", unlockAudio);
    return () => {
      document.removeEventListener("click", unlockAudio);
      document.removeEventListener("touchstart", unlockAudio);
    };
  }, []);

  // 6. Polling Inteligente
  useEffect(() => {
    const checkNewBookings = async () => {
      try {
        const res = await fetch("/api/admin/notifications/latest");
        if (!res.ok) return;
        
        const data = await res.json();
        
        if (lastSeenIdRef.current === null) {
          lastSeenIdRef.current = data.lastId;
          return;
        }

        if (data.lastId && data.lastId !== lastSeenIdRef.current) {
          lastSeenIdRef.current = data.lastId;
          const details = data.details || {};

          // --- AÇÃO 1: SOM ---
          if (!isMuted && audioRef.current) {
            audioRef.current.play().catch((err) => console.error("Erro áudio:", err));
          }
          
          // --- AÇÃO 2: NOTIFICAÇÃO DE SISTEMA ---
          sendSystemNotification(details.cliente || "Cliente", details.servico || "Serviço");

          // --- AÇÃO 3: TOAST NA TELA ---
          toast.success(`Novo: ${details.cliente}`, {
            duration: Infinity,
            description: (
              <div className="mt-2 space-y-1">
                <p className="font-bold text-zinc-200">{details.servico}</p>
                <div className="flex items-center gap-3 text-xs text-zinc-400">
                  <span className="flex items-center gap-1"><Calendar size={12}/> {details.data}</span>
                  <span className="flex items-center gap-1"><Clock size={12}/> {details.horario}</span>
                </div>
              </div>
            ),
            action: {
              label: "Ver",
              onClick: () => window.location.reload()
            }
          });
        }
      } catch (error) {
        console.error("Erro polling:", error);
      }
    };

    const interval = setInterval(checkNewBookings, 5000);
    checkNewBookings();

    return () => clearInterval(interval);
  }, [isMuted]);

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2">
      {permission !== "granted" && (
        <button
          onClick={requestNotificationAccess}
          className="p-3 rounded-full shadow-lg border bg-blue-500 text-white border-blue-400 animate-bounce"
          title="Ativar Notificações de Segundo Plano"
        >
          <Lock size={20} />
        </button>
      )}

      <button
        onClick={() => {
          const newState = !isMuted;
          setIsMuted(newState);
          localStorage.setItem("admin_sound_muted", String(newState));
          toast(newState ? "Som desativado" : "Som ativado");
        }}
        className={`
          p-3 rounded-full shadow-lg border transition-all duration-300 hover:scale-110
          ${isMuted 
            ? "bg-zinc-800 text-zinc-400 border-zinc-700" 
            : "bg-emerald-500 text-zinc-950 border-emerald-400 shadow-emerald-500/20"
          }
        `}
      >
        {isMuted ? <BellOff size={20} /> : <Bell size={20} />}
      </button>
    </div>
  );
}