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
        toast.success("Sistema de alerta ativado!");
      }
    }
  };

  useEffect(() => {
    if (!enabled && permission !== "granted") return;

    const checkNewBookings = async () => {
      try {
        const res = await fetch("/api/admin/notifications/latest");
        const data = await res.json();
        
        if (data.error) return;

        if (!lastBookingId) {
          if (data.id) setLastBookingId(data.id);
          return;
        }

        if (data.id && data.id !== lastBookingId) {
          
          // 1. Toca o Som
          if (audioRef.current) {
            audioRef.current.currentTime = 0;
            audioRef.current.play().catch(e => console.error("Erro som:", e));
          }

          // 2. Manda Notificação Visual (Corrigido com 'as any')
          if (permission === "granted" && "serviceWorker" in navigator) {
            navigator.serviceWorker.ready.then((registration) => {
              registration.showNotification("Novo Agendamento! 💰", {
                body: `Cliente: ${data.customerName || 'Novo Cliente'}`,
                icon: "/logo.png",
                vibrate: [200, 100, 200],
                tag: "new-booking"
              } as any); // <--- O PULO DO GATO: O 'as any' remove o erro vermelho
            });
          }

          setLastBookingId(data.id);
          toast.success("Novo agendamento recebido!");
        }
      } catch (error) {
        console.error("Erro no check:", error);
      }
    };

    const interval = setInterval(checkNewBookings, 15000); 
    checkNewBookings(); 

    return () => clearInterval(interval);
  }, [enabled, lastBookingId, permission]);

  if (enabled && permission === "granted") return null;

  return (
    <div className="fixed top-4 right-4 z-50 animate-bounce">
      <button
        onClick={enableNotifications}
        className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-3 rounded-full shadow-xl font-bold border-2 border-white"
      >
        <BellOff size={20} />
        ATIVAR PLANTÃO
      </button>
    </div>
  );
}