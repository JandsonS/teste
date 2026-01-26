"use client";

import { useEffect, useState, useRef } from "react";
import { toast } from "sonner";
import { Bell, BellOff } from "lucide-react";

export default function AdminNotificationListener() {
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [enabled, setEnabled] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  
  // Guardamos o ID do último agendamento para saber se chegou um novo
  const [lastBookingId, setLastBookingId] = useState<string | null>(null);

  useEffect(() => {
    // 1. Inicializa o áudio
    audioRef.current = new Audio("/notification.mp3");
    
    // 2. Verifica permissão atual
    if ("Notification" in window) {
      setPermission(Notification.permission);
    }
  }, []);

  // Função para ativar o "Plantão" (Desbloqueia o som do navegador)
  const enableNotifications = async () => {
    if ("Notification" in window) {
      const result = await Notification.requestPermission();
      setPermission(result);
      
      if (result === "granted") {
        // Toca um som mudo ou baixinho só para "destravar" o navegador
        audioRef.current?.play().catch(() => {}); 
        setEnabled(true);
        toast.success("Notificações ativadas com sucesso!");
      }
    }
  };

  // O Polling (Verificação automática a cada 30 segundos)
  useEffect(() => {
    if (!enabled) return;

    const checkNewBookings = async () => {
      try {
        // Chama sua API que busca o ÚLTIMO agendamento
        const res = await fetch("/api/admin/notifications/latest");
        if (!res.ok) return;
        
        const data = await res.json();
        
        // Se for a primeira carga, só salva o ID
        if (!lastBookingId) {
          setLastBookingId(data.id);
          return;
        }

        // SE o ID que veio da API for diferente do que eu tenho salvo: TEM NOVIDADE!
        if (data.id !== lastBookingId) {
            
          // 1. Toca o som
          audioRef.current?.play().catch((e) => console.error("Erro ao tocar som:", e));
          
          // 2. Notificação na Barra de Status (Celular/PC)
          if (permission === "granted") {
             // Tenta vibrar o celular também
             if (navigator.vibrate) navigator.vibrate([200, 100, 200]);

             new Notification("Novo Agendamento! 💰", {
              body: `Cliente: ${data.customerName} - ${data.serviceName}`,
              icon: "/icon.png", // Sua logo
              tag: "new-booking" // Evita flood de notificações
            });
          }

          // 3. Atualiza o ID para não apitar de novo pelo mesmo cliente
          setLastBookingId(data.id);
          
          // 4. Aviso visual na tela
          toast.success("Novo agendamento recebido!", { duration: 5000 });
        }

      } catch (error) {
        console.error("Erro ao verificar notificações", error);
      }
    };

    // Roda a verificação agora e depois a cada 30 segundos
    checkNewBookings();
    const interval = setInterval(checkNewBookings, 30000); 

    return () => clearInterval(interval);
  }, [enabled, lastBookingId, permission]);

  // Se já estiver ativado, não mostra botão nenhum (fica invisível trabalhando no fundo)
  if (enabled) return null;

  // Botão para desbloquear o som (Obrigatório pelo Chrome/Android)
  return (
    <div className="fixed top-4 right-4 z-50">
      <button
        onClick={enableNotifications}
        className="flex items-center gap-2 bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-full shadow-lg font-bold animate-pulse"
      >
        <BellOff size={20} />
        Ativar Sons de Notificação
      </button>
    </div>
  );
}