"use client";
import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";

export default function AdminNotificationListener() {
  const [logs, setLogs] = useState<string[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const addLog = (msg: string) => setLogs(prev => [`> ${msg}`, ...prev]);

  useEffect(() => {
    // Tenta carregar o áudio assim que abre
    audioRef.current = new Audio("/alert.mp3");
    addLog("Componente montado. Buscando audio /alert.mp3...");
    
    // Verifica permissão inicial
    if ("Notification" in window) {
      addLog(`Permissão atual: ${Notification.permission}`);
    } else {
      addLog("ERRO: Este navegador não suporta notificações.");
    }
  }, []);

  // TESTE 1: SOM 🎵
  const testSound = () => {
    addLog("Tentando tocar som...");
    if (!audioRef.current) return addLog("Erro: Audio não inicializado");
    
    audioRef.current.play()
      .then(() => addLog("SUCESSO: O som deve estar tocando!"))
      .catch((e) => addLog(`ERRO SOM: ${e.message}`));
  };

  // TESTE 2: NOTIFICAÇÃO VISUAL 🔔
  const testNotification = async () => {
    addLog("Tentando notificação visual...");
    
    if (Notification.permission !== "granted") {
      addLog("Pedindo permissão...");
      const permission = await Notification.requestPermission();
      addLog(`Nova permissão: ${permission}`);
      if (permission !== "granted") return;
    }

    try {
      if (navigator.vibrate) navigator.vibrate([200]);
      const n = new Notification("Teste de Notificação", {
        body: "Se você leu isso, funcionou!",
        icon: "/logo.png"
      });
      addLog("SUCESSO: Comando de notificação enviado.");
    } catch (e: any) {
      addLog(`ERRO NOTIF: ${e.message}`);
    }
  };

  // TESTE 3: API (Ver se acha agendamentos) 🌐
  const testApi = async () => {
    addLog("Testando conexão com API...");
    try {
      const res = await fetch("/api/admin/notifications/latest");
      addLog(`Status da API: ${res.status}`);
      
      if (!res.ok) throw new Error("API retornou erro");
      
      const data = await res.json();
      addLog(`Dados recebidos: ${JSON.stringify(data)}`);
    } catch (e: any) {
      addLog(`ERRO API: ${e.message}`);
    }
  };

  return (
    <div className="fixed bottom-0 left-0 w-full bg-black/95 text-green-400 p-4 font-mono text-xs z-[9999] border-t-2 border-green-600 max-h-[50vh] overflow-y-auto">
      <div className="flex gap-2 mb-3 flex-wrap">
        <button onClick={testSound} className="bg-gray-800 hover:bg-gray-700 px-4 py-2 rounded border border-gray-600 font-bold text-white">
          1. Testar Som 🎵
        </button>
        <button onClick={testNotification} className="bg-gray-800 hover:bg-gray-700 px-4 py-2 rounded border border-gray-600 font-bold text-white">
          2. Testar Notif 🔔
        </button>
        <button onClick={testApi} className="bg-gray-800 hover:bg-gray-700 px-4 py-2 rounded border border-gray-600 font-bold text-white">
          3. Checar API 🌐
        </button>
      </div>
      <div className="flex flex-col gap-1 opacity-90">
        {logs.map((log, i) => (
          <div key={i} className="border-b border-gray-800 pb-1">{log}</div>
        ))}
      </div>
    </div>
  );
}