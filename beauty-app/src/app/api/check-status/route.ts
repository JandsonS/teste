import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma"; // Confirme se o caminho do seu prisma está certo

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id"); // Recebe o ID do agendamento (Ex: cmlcz...)

    if (!id) {
      return NextResponse.json({ error: "ID obrigatório" }, { status: 400 });
    }

    // 1. Busca direto no seu Banco de Dados
    const agendamento = await prisma.agendamento.findUnique({
        where: { id: id },
        select: { status: true } // Só precisamos saber o status
    });

    if (!agendamento) {
        return NextResponse.json({ error: "Agendamento não encontrado" }, { status: 404 });
    }

    // 2. Devolve exatamente o que está no banco
    // Se você colocou "CONFIRMADO" lá, vai sair "CONFIRMADO" aqui.
    return NextResponse.json({ status: agendamento.status });

  } catch (error) {
    console.error("Erro ao verificar status:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}