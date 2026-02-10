import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma"; // Verifique se o caminho do seu prisma está certo

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get("slug");

  if (!slug) {
    return NextResponse.json({ error: "Slug obrigatório" }, { status: 400 });
  }

  // Busca a loja pelo slug
  const loja = await prisma.estabelecimento.findUnique({
    where: { slug: slug },
    select: { 
        id: true, 
        nome: true,
        mercadoPagoToken: true // Já trazemos o token se existir
    } 
  });

  if (!loja) {
    return NextResponse.json({ error: "Loja não encontrada" }, { status: 404 });
  }

  return NextResponse.json(loja);
}