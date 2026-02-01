import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const config = await prisma.configuracao.findUnique({
      where: { id: "settings" },
    });

    if (!config) {
      return NextResponse.json({
        porcentagemSinal: 50,
        precoServico: 0,
        horarioAbertura: "08:00",
        horarioFechamento: "20:00",
        nomeEstabelecimento: "Minha Barbearia",
        corPrincipal: "#10b981",
        telefoneWhatsApp: "",
        logoUrl: "" 
      });
    }

    return NextResponse.json(config);
  } catch (error) {
    return NextResponse.json({ error: "Erro ao buscar configurações" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // Validações básicas para evitar números quebrados
    const porcentagemSinal = isNaN(Number(body.porcentagemSinal)) ? 50 : Number(body.porcentagemSinal);
    const precoServico = isNaN(Number(body.precoServico)) ? 0 : Number(body.precoServico);
    const horarioAbertura = body.horarioAbertura || "08:00";
    const horarioFechamento = body.horarioFechamento || "20:00";

    const settings = await prisma.configuracao.upsert({
      where: { id: "settings" },
      update: {
        porcentagemSinal: porcentagemSinal,
        precoServico: precoServico,
        horarioAbertura: horarioAbertura,
        horarioFechamento: horarioFechamento,
        nomeEstabelecimento: body.nomeEstabelecimento || "Minha Loja",
        telefoneWhatsApp: body.telefoneWhatsApp || "",
        corPrincipal: body.corPrincipal || "#10b981",
        logoUrl: body.logoUrl || "", // <--- AGORA ESTÁ NO LUGAR CERTO
      },
      create: {
        id: "settings",
        porcentagemSinal: porcentagemSinal,
        precoServico: precoServico,
        horarioAbertura: horarioAbertura,
        horarioFechamento: horarioFechamento,
        nomeEstabelecimento: body.nomeEstabelecimento || "Minha Loja",
        telefoneWhatsApp: body.telefoneWhatsApp || "",
        corPrincipal: body.corPrincipal || "#10b981",
        logoUrl: body.logoUrl || "", // <--- AQUI TAMBÉM
      },
    });

    return NextResponse.json(settings);
  } catch (error) {
    console.error("Erro ao salvar:", error);
    return NextResponse.json({ error: "Erro ao salvar configurações" }, { status: 500 });
  }
}