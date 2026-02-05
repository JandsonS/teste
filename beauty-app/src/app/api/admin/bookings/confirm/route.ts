import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma"; // Certifique-se que o caminho está certo

export async function PATCH(req: Request) {
  try {
    const { id } = await req.json();

    if (!id) {
      return NextResponse.json({ message: "ID obrigatório" }, { status: 400 });
    }

    // CORREÇÃO: Atualizamos APENAS o status.
    // Não mexemos no 'valor', mantendo o preço original do serviço.
    const updated = await prisma.agendamento.update({
      where: { id },
      data: {
        status: "PAGO" 
        // O valor original (ex: 50.00 ou 30.00) é mantido intacto.
      },
    });

    return NextResponse.json({ message: "Sucesso! Agendamento confirmado.", updated }, { status: 200 });

  } catch (error) {
    console.error("ERRO_API:", error);
    return NextResponse.json({ message: "Erro no servidor" }, { status: 500 });
  }
}