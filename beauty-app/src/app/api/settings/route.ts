import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// --- GET: Busca as configurações de UMA loja específica ---
export async function GET(request: Request) {
  try {
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
    // ADICIONAMOS: provedor, tokens e chaves do Inter/Asaas/PagBank
    return NextResponse.json({
        nomeEstabelecimento: loja.nome,
        corPrincipal: loja.corPrincipal,
        telefoneWhatsApp: loja.telefoneWhatsApp,
        logoUrl: loja.logoUrl,
        
        // Regra de Negócio
        porcentagemSinal: loja.porcentagemSinal,
        horarioAbertura: loja.horarioAbertura,
        horarioFechamento: loja.horarioFechamento,

        // --- DADOS BANCÁRIOS (Novos) ---
        provedor: loja.provedor,
        mercadoPagoToken: loja.mercadoPagoToken,
        interClientId: loja.interClientId,
        interClientSecret: loja.interClientSecret,
        interCert: loja.interCert,
        interKey: loja.interKey,
        asaasToken: loja.asaasToken,
        pagbankToken: loja.pagbankToken,
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
    const { slug } = body; 

    if (!slug) {
        return NextResponse.json({ error: "Erro: Loja não identificada (Slug faltando)" }, { status: 400 });
    }

    console.log(`📝 Atualizando configurações (Pagamento + Geral) para: ${slug}`);

    // Atualiza APENAS a linha desta loja específica
    const lojaAtualizada = await prisma.estabelecimento.update({
      where: { slug: slug },
      data: {
        // --- DADOS GERAIS (Mantidos) ---
        nome: body.nomeEstabelecimento, 
        telefoneWhatsApp: body.telefoneWhatsApp,
        corPrincipal: body.corPrincipal,
        logoUrl: body.logoUrl,
        
        horarioAbertura: body.horarioAbertura || "08:00",
        horarioFechamento: body.horarioFechamento || "20:00",
        
        // --- REGRA DO SINAL (Correção do Bug) ---
        // Forçamos 'Number' para garantir que não vire texto "20" e sim número 20.0
        porcentagemSinal: Number(body.porcentagemSinal), 

        // --- DADOS BANCÁRIOS (Novos) ---
        provedor: body.provedor, // Ex: 'MERCADOPAGO', 'ASAAS', etc
        
        mercadoPagoToken: body.mercadoPagoToken,
        
        interClientId: body.interClientId,
        interClientSecret: body.interClientSecret,
        interCert: body.interCert,
        interKey: body.interKey,
        
        asaasToken: body.asaasToken,
        
        pagbankToken: body.pagbankToken,
      },
    });

    return NextResponse.json(lojaAtualizada);

  } catch (error) {
    console.error("❌ Erro ao salvar settings:", error);
    return NextResponse.json({ error: "Erro ao salvar configurações" }, { status: 500 });
  }
}