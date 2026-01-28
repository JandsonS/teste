import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    // O Prisma mapeia 'Configuracao' para 'configuracao' (minúsculo) no Client
    let config = await prisma.configuracao.findFirst();

    if (!config) {
      config = await prisma.configuracao.create({
        data: {
          porcentagemSinal: 50.0,
          precoServico: 1.0,
          horarioAbertura: "08:00",
          horarioFechamento: "20:00"
        }
      });
    }

    return NextResponse.json(config);
  } catch (error) {
    return NextResponse.json({ error: "Erro ao buscar" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const data = await req.json();
    const currentConfig = await prisma.configuracao.findFirst();

    if (!currentConfig) {
      return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
    }

    const updated = await prisma.configuracao.update({
      where: { id: currentConfig.id },
      data: {
        porcentagemSinal: Number(data.porcentagemSinal),
        precoServico: Number(data.precoServico),
        horarioAbertura: data.horarioAbertura,
        horarioFechamento: data.horarioFechamento,
      }
    });

    return NextResponse.json(updated);
  } catch (error) {
    return NextResponse.json({ error: "Erro ao salvar" }, { status: 500 });
  }
}