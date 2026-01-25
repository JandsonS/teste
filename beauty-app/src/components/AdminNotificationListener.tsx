"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner"; // Supondo que você usa o sonner ou similar
import { Bell } from "lucide-react";

export default function AdminNotificationListener() {
  const [lastSeenId, setLastSeenId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [audioAllowed, setAudioAllowed] = useState(false);

  // 1. Inicializa o áudio
  useEffect(() => {
    audioRef.current = new Audio("/alert.mp3");
  }, []);

  // 2. Função que toca o som (Navegadores bloqueiam som automático sem interação)
  const playSound = () => {
    if (audioRef.current) {
      audioRef.current.play().catch((err) => {
        console.log("O navegador bloqueou o som automático:", err);
      });
    }
  };

  // 3. O Loop de Verificação (Polling)
  useEffect(() => {
    const checkNewBookings = async () => {
      try {
        const res = await fetch("/api/admin/notifications/latest");
        if (!res.ok) return;
        
        const data = await res.json();
        
        // Se for a primeira carga da página, apenas salva o ID atual
        if (lastSeenId === null) {
          setLastSeenId(data.lastId);
          return;
        }

        // Se o ID que veio do banco é diferente do que eu tenho salvo...
        if (data.lastId && data.lastId !== lastSeenId) {
          // NOVO AGENDAMENTO DETECTADO!
          setLastSeenId(data.lastId);
          
          // Toca o som
          playSound();
          
          // Mostra alerta na tela
          toast.success("🔔 Novo Agendamento Realizado!", {
            duration: 5000,
            action: {
              label: "Ver",
              onClick: () => window.location.reload() // Ou redirecionar
            }
          });
        }
      } catch (error) {
        console.error("Erro ao checar notificações", error);
      }
    };

    // Roda a cada 30 segundos
    const interval = setInterval(checkNewBookings, 30000);

    // Roda uma vez imediatamente ao montar
    checkNewBookings();

    return () => clearInterval(interval);
  }, [lastSeenId]);

  // UI: Botão discreto para habilitar som (necessário p/ navegadores modernos)
  if (audioAllowed) return null; // Se já permitiu, fica invisível

  return (
    <button
      onClick={() => {
        setAudioAllowed(true);
        playSound(); // Toca um som de teste
        toast.success("Notificações sonoras ativadas!");
      }}
      className="fixed bottom-4 right-4 bg-emerald-500 text-black px-4 py-2 rounded-full text-sm font-bold shadow-lg z-50 flex items-center gap-2 hover:bg-emerald-400 transition-all animate-bounce"
    >
      <Bell size={16} />
      Ativar Som de Pedidos
    </button>
  );
}