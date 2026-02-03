import { prisma } from "@/lib/prisma";
import ClientPage from "./ClientPage";
export const dynamic = 'force-dynamic';
async function getLojaInfo() {
  try {
    const settings = await prisma.configuracao.findUnique({
      where: { id: "settings" }
    });

    return {
      nome: settings?.nomeEstabelecimento || "",
      whatsapp: settings?.telefoneWhatsApp || "",
      logo: settings?.logoUrl || "" // <--- Busca a logo nova
    };
  } catch (error) {
    return { nome: "", whatsapp: "", logo: "" };
  }
}

export default async function Home() {
  const loja = await getLojaInfo();

  return (
    <ClientPage 
      dbNome={loja.nome} 
      dbWhatsapp={loja.whatsapp} 
      dbLogo={loja.logo} // <--- Entrega para o site
    />
  );
}