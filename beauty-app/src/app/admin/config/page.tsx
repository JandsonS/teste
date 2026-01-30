"use client"
import { Button } from "@/components/ui/button"
import { Bell } from "lucide-react"
import { toast } from "sonner"

export default function ConfigPage() {
  
  const assinarNotificacoes = async () => {
    try {
        const registration = await navigator.serviceWorker.register("/sw.js");
        const subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
        });

        // Salva no banco
        await fetch("/api/push/register", {
            method: "POST",
            body: JSON.stringify(subscription),
            headers: { "Content-Type": "application/json" }
        });

        toast.success("Notificações Ativadas!", { description: "Você receberá avisos de pagamento." });
    } catch (error) {
        console.error(error);
        toast.error("Erro ao ativar", { description: "Verifique se o site tem HTTPS e não está em aba anônima." });
    }
  }

  return (
    <div className="p-10 text-white">
        <h1>Configurações Admin</h1>
        <Button onClick={assinarNotificacoes} className="mt-4 bg-emerald-500">
            <Bell className="mr-2" /> Ativar Notificações Neste Dispositivo
        </Button>
    </div>
  )
}