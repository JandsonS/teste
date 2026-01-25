"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Bell, BellOff } from "lucide-react"; // Certifique-se de ter lucide-react instalado

export default function AdminNotificationListener() {
  // Estado do som (Lê do navegador ou começa Ativado)
  const [isMuted, setIsMuted] = useState(false);
  
  // Refs para lógica interna
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const lastSeenIdRef = useRef<string | null>(null);
  const isUnlockedRef = useRef(false); // Para saber se já destravamos o áudio

  // 1. Carrega a preferência do usuário ao iniciar
  useEffect(() => {
    const savedPreference = localStorage.getItem("admin_sound_muted");
    if (savedPreference === "true") {
      setIsMuted(true);
    }
    audioRef.current = new Audio("/alert.mp3");
  }, []);

  // 2. Alternar Som (Botão)
  const toggleMute = () => {
    const newState = !isMuted;
    setIsMuted(newState);
    localStorage.setItem("admin_sound_muted", String(newState));

    if (!newState) {
      toast.success("Som ativado! 🔔");
      // Toca um preview se ativar
      audioRef.current?.play().catch(() => {});
    } else {
      toast.info("Som desativado 🔕");
    }
  };

  // 3. Destrava o Áudio (Auto-Unlock no primeiro clique)
  useEffect(() => {
    const unlockAudio = () => {
      if (isUnlockedRef.current) return;
      
      if (audioRef.current) {
        audioRef.current.play().catch(() => {});
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
        isUnlockedRef.current = true; // Marcamos como destravado
      }
    };

    // Adiciona ouvintes para destravar na primeira interação
    document.addEventListener("click", unlockAudio);
    document.addEventListener("touchstart", unlockAudio);

    return () => {
      document.removeEventListener("click", unlockAudio);
      document.removeEventListener("touchstart", unlockAudio);
    };
  }, []);

  // 4. Polling (Checagem de novos pedidos)
  useEffect(() => {
    const checkNewBookings = async () => {
      try {
        const res = await fetch("/api/admin/notifications/latest");
        if (!res.ok) return;
        
        const data = await res.json();
        
        // Primeira carga: só sincroniza ID
        if (lastSeenIdRef.current === null) {
          lastSeenIdRef.current = data.lastId;
          return;
        }

        // Se ID mudou = NOVO PEDIDO
        if (data.lastId && data.lastId !== lastSeenIdRef.current) {
          lastSeenIdRef.current = data.lastId;
          
          // Só toca se NÃO estiver mudo
          if (!isMuted && audioRef.current) {
            audioRef.current.play().catch((err) => console.error("Erro áudio:", err));
          }
          
          // O Toast visual aparece de qualquer jeito
          toast.success("Novo Agendamento! ✂️", {
            description: "Atualize a página para ver detalhes.",
            duration: Infinity,
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
  }, [isMuted]); // Recria o efeito se o estado "mute" mudar

  // 5. Interface do Botão Flutuante (Bottom-Right)
  return (
    <button
      onClick={toggleMute}
      className={`
        fixed bottom-5 right-5 z-50 p-3 rounded-full shadow-lg border transition-all duration-300 hover:scale-110
        ${isMuted 
          ? "bg-zinc-800 text-zinc-400 border-zinc-700 hover:text-white" // Estilo Desativado
          : "bg-emerald-500 text-zinc-950 border-emerald-400 shadow-emerald-500/20" // Estilo Ativado
        }
      `}
      title={isMuted ? "Ativar notificações sonoras" : "Desativar notificações sonoras"}
    >
      {isMuted ? <BellOff size={20} /> : <Bell size={20} />}
    </button>
  );
}