import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma"; // Verifique se o caminho do seu prisma está aqui

export async function PUT(req: Request) {
  try {
    const { id, status } = await req.json();

    if (!id || !status) {
      return NextResponse.json({ error: "Dados incompletos" }, { status: 400 });
    }

    // Atualiza no Banco de Dados
    const updatedBooking = await prisma.agendamento.update({
      where: { id: id },
      data: { status: status },
    });

    return NextResponse.json({ success: true, booking: updatedBooking });
  } catch (error) {
    console.error("Erro ao atualizar status:", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}