import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma"; // Certifique-se que o caminho do seu prisma está correto

export async function PUT(req: Request) {
  try {
    const { id, status } = await req.json();

    if (!id || !status) {
      return NextResponse.json({ error: "ID e Status são obrigatórios" }, { status: 400 });
    }

    // Atualiza o status no banco de dados
    const updatedBooking = await prisma.agendamento.update({
      where: { id: id },
      data: { status: status },
    });

    return NextResponse.json({ success: true, booking: updatedBooking });
  } catch (error) {
    console.error("Erro ao atualizar status:", error);
    return NextResponse.json(
      { error: "Erro interno ao atualizar agendamento." },
      { status: 500 }
    );
  }
}