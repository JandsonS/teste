import AdminNotificationListener from "@/components/AdminNotificationListener";
import InstallPrompt from "@/components/InstallPrompt"; // <--- 1. Importe o novo componente

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {/* 2. Componente que toca o som de notificação */}
      <AdminNotificationListener />
      
      {/* 3. Componente que oferece a instalação (App/PWA) */}
      <InstallPrompt /> 
      
      {/* Conteúdo da página */}
      <div className="min-h-screen bg-zinc-950">
        {children}
      </div>
    </>
  );
}