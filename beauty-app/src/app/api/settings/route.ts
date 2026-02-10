import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// --- GET: Busca as configurações de UMA loja específica ---
export async function GET(request: Request) {
  try {
    // Pega o slug da URL (ex: /api/settings?slug=barbearia-vip)
    const { searchParams } = new URL(request.url);
    const slug = searchParams.get("slug");

    if (!slug) {
      return NextResponse.json({ error: "Slug da loja não informado" }, { status: 400 });
    }

    const loja = await prisma.estabelecimento.findUnique({
      where: { slug: slug },
    });

    if (!loja) {
      return NextResponse.json({ error: "Loja não encontrada" }, { status: 404 });
    }

    // Retorna no formato que o frontend espera
    return NextResponse.json({
        nomeEstabelecimento: loja.nome,
        corPrincipal: loja.corPrincipal,
        telefoneWhatsApp: loja.telefoneWhatsApp,
        logoUrl: loja.logoUrl,
        porcentagemSinal: loja.porcentagemSinal,
        horarioAbertura: loja.horarioAbertura,
        horarioFechamento: loja.horarioFechamento,
    });

  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Erro ao buscar configurações" }, { status: 500 });
  }
}

// --- POST: Salva as configurações na loja certa ---
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { slug } = body; // <--- O PULO DO GATO: Recebe o slug do frontend

    if (!slug) {
        return NextResponse.json({ error: "Erro: Loja não identificada (Slug faltando)" }, { status: 400 });
    }

    console.log(`📝 Atualizando configurações para a loja: ${slug}`);

    // Atualiza APENAS a linha desta loja específica
    const lojaAtualizada = await prisma.estabelecimento.update({
      where: { slug: slug },
      data: {
        nome: body.nomeEstabelecimento, // Mapeia o nome do form para o banco
        telefoneWhatsApp: body.telefoneWhatsApp,
        corPrincipal: body.corPrincipal,
        logoUrl: body.logoUrl,
        
        // Garante que é número (Float)
        porcentagemSinal: Number(body.porcentagemSinal), 
        
        // Mantém horários se vierem, senão usa padrão
        horarioAbertura: body.horarioAbertura || "08:00",
        horarioFechamento: body.horarioFechamento || "20:00",
      },
    });

    return NextResponse.json(lojaAtualizada);

  } catch (error) {
    console.error("❌ Erro ao salvar settings:", error);
    return NextResponse.json({ error: "Erro ao salvar configurações" }, { status: 500 });
  }
}