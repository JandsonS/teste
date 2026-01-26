import AdminNotificationListener from "@/components/AdminNotificationListener";
import InstallPrompt from "@/components/InstallPrompt";
import AdminSettings from "@/components/AdminSettings"; // <--- 1. Importação Nova

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {/* Mantém a tela ligada (Invisível) */}
      <AdminNotificationListener />
      
      {/* Oferece instalação do App (PWA) */}
      <InstallPrompt /> 
      
      {/* O Botão de Engrenagem Flutuante (Novo) */}
      <AdminSettings />

      {/* Conteúdo da página */}
      <div className="min-h-screen bg-zinc-950">
        {children}
      </div>
    </>
  );
}