"use client";

import { useEffect, useState, useRef } from "react";
import { toast } from "sonner";
import { Bell, BellOff } from "lucide-react";

export default function AdminNotificationListener() {
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [enabled, setEnabled] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  
  const [lastBookingId, setLastBookingId] = useState<string | null>(null);

  useEffect(() => {
    // CORREÇÃO 1: Agora aponta para o arquivo que existe na sua pasta
    audioRef.current = new Audio("/alert.mp3");
    
    if ("Notification" in window) {
      setPermission(Notification.permission);
    }
  }, []);

  const enableNotifications = async () => {
    if ("Notification" in window) {
      const result = await Notification.requestPermission();
      setPermission(result);
      
      if (result === "granted") {
        audioRef.current?.play().catch(() => {}); 
        setEnabled(true);
        toast.success("Notificações ativadas!");
      }
    }
  };

  useEffect(() => {
    // Se não tiver ativado pelo botão, não roda a verificação
    if (!enabled && permission !== "granted") return;

    const checkNewBookings = async () => {
      try {
        const res = await fetch("/api/admin/notifications/latest");
        if (!res.ok) return;
        
        const data = await res.json();
        
        if (!lastBookingId) {
          setLastBookingId(data.id);
          return;
        }

        if (data.id && data.id !== lastBookingId) {
          // 1. Toca o som (agora vai achar o arquivo!)
          audioRef.current?.play().catch((e) => console.error("Erro som:", e));
          
          // 2. Notificação Visual
          if (permission === "granted") {
             if (navigator.vibrate) navigator.vibrate([200, 100, 200]);

             new Notification("Novo Agendamento! 💰", {
              body: `Cliente: ${data.customerName || 'Novo Cliente'}`,
              icon: "/logo.png", // CORREÇÃO 2: Usa sua logo.png
              tag: "new-booking"
            });
          }

          setLastBookingId(data.id);
          toast.success("Novo agendamento recebido!");
        }

      } catch (error) {
        console.error("Erro check:", error);
      }
    };

    // Verifica a cada 15 segundos
    checkNewBookings();
    const interval = setInterval(checkNewBookings, 15000); 

    return () => clearInterval(interval);
  }, [enabled, lastBookingId, permission]);

  // Mostra o botão se a permissão não foi dada ou se o "plantão" não foi ativado
  if (enabled && permission === "granted") return null;

  return (
    <div className="fixed top-4 right-4 z-50">
      <button
        onClick={enableNotifications}
        className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-3 rounded-full shadow-xl font-bold animate-bounce"
      >
        <BellOff size={20} />
        Ativar Som de Pedidos
      </button>
    </div>
  );
}