"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Bell, BellOff, Calendar, Clock, User } from "lucide-react";

export default function AdminNotificationListener() {
  const [isMuted, setIsMuted] = useState(false);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const lastSeenIdRef = useRef<string | null>(null);
  const isUnlockedRef = useRef(false);

  useEffect(() => {
    const savedPreference = localStorage.getItem("admin_sound_muted");
    if (savedPreference === "true") setIsMuted(true);
    audioRef.current = new Audio("/alert.mp3");
  }, []);

  const toggleMute = () => {
    const newState = !isMuted;
    setIsMuted(newState);
    localStorage.setItem("admin_sound_muted", String(newState));
    if (!newState) {
      toast.success("Som ativado! 🔔");
      audioRef.current?.play().catch(() => {});
    } else {
      toast.info("Som desativado 🔕");
    }
  };

  useEffect(() => {
    const unlockAudio = () => {
      if (isUnlockedRef.current) return;
      if (audioRef.current) {
        audioRef.current.play().catch(() => {});
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
        isUnlockedRef.current = true;
      }
    };
    document.addEventListener("click", unlockAudio);
    document.addEventListener("touchstart", unlockAudio);
    return () => {
      document.removeEventListener("click", unlockAudio);
      document.removeEventListener("touchstart", unlockAudio);
    };
  }, []);

  // POLLING
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
          
          if (!isMuted && audioRef.current) {
            audioRef.current.play().catch((err) => console.error("Erro áudio:", err));
          }
          
          // --- AQUI ESTÁ A MÁGICA DA NOTIFICAÇÃO RICA ---
          const details = data.details || {};
          
          toast.success(`Novo Agendamento: ${details.cliente}`, {
            duration: Infinity, // Fica na tela até clicar
            
            // Formatamos a descrição com ícones e quebra de linha
            description: (
              <div className="mt-2 space-y-1">
                <p className="font-bold text-zinc-200">{details.servico}</p>
                <div className="flex items-center gap-3 text-xs text-zinc-400">
                  <span className="flex items-center gap-1">
                    <Calendar size={12} /> {details.data}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock size={12} /> {details.horario}
                  </span>
                </div>
              </div>
            ),
            
            action: {
              label: "Ver na Agenda",
              onClick: () => {
                // Truque para "filtrar": Vamos recarregar a página e focar
                // Como geralmente o admin ordena por "Mais Recente", ele já vai aparecer no topo.
                window.location.reload(); 
              }
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
    <button
      onClick={toggleMute}
      className={`
        fixed bottom-5 right-5 z-50 p-3 rounded-full shadow-lg border transition-all duration-300 hover:scale-110
        ${isMuted 
          ? "bg-zinc-800 text-zinc-400 border-zinc-700 hover:text-white" 
          : "bg-emerald-500 text-zinc-950 border-emerald-400 shadow-emerald-500/20"
        }
      `}
      title={isMuted ? "Ativar som" : "Desativar som"}
    >
      {isMuted ? <BellOff size={20} /> : <Bell size={20} />}
    </button>
  );
}