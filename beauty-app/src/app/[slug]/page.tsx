import { prisma } from "@/lib/prisma";
import ClientPage from "@/components/ClientPage"; 
import { notFound } from "next/navigation";

export const dynamic = 'force-dynamic';

// ATENÇÃO: Mudamos a tipagem de params para Promise<{ slug: string }>
export default async function StorePage({ params }: { params: Promise<{ slug: string }> }) {
  
  // 1. OBRIGATÓRIO NO NEXT.JS 15+: Aguardar os parâmetros
  const { slug } = await params;

  // 2. Agora o slug existe e podemos buscar no banco
  const loja = await prisma.estabelecimento.findUnique({
    where: { slug: slug },
    include: {
      servicos: {
        where: { active: true },
        orderBy: { price: 'asc' }
      }
    }
  });

  // 3. Se não achar, erro 404
  if (!loja) return notFound();

  // 4. Entrega os dados para o Visual
  return (
    <ClientPage 
      establishmentId={loja.id}
      dbNome={loja.nome} 
      dbWhatsapp={loja.telefoneWhatsApp || ""} 
      dbLogo={loja.logoUrl || ""} 
      dbCor={loja.corPrincipal}
      dbServices={loja.servicos}
      slug={slug}
    />
  );
}