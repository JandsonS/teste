import AdminNotificationListener from "@/components/AdminNotificationListener";
import InstallPrompt from "@/components/InstallPrompt";

export const dynamic = 'force-dynamic';

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

      {/* Conteúdo da página */}
      <div className="min-h-screen bg-zinc-950">
        {children}
      </div>
    </>
  );
}