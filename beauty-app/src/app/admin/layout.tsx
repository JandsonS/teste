import AdminNotificationListener from "@/components/AdminNotificationListener"; // Importando o nosso componente "Ouvido"

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {/* Este componente invisível fica aqui vigiando.
        Como está dentro de /admin, só carrega quando você loga no painel.
      */}
      <AdminNotificationListener />
      
      {/* Aqui carrega o conteúdo das páginas do admin (Dashboard, Login, etc) */}
      <div className="min-h-screen bg-zinc-950">
        {children}
      </div>
    </>
  );
}