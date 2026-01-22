import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PUT(req: Request) {
  try {
    const { id, status } = await req.json();

    // 1. Validação Essencial (MANTIDA)
    if (!id || !status) {
      return NextResponse.json({ error: "ID e Status são obrigatórios" }, { status: 400 });
    }

    // 2. NOVA REGRA: Limpeza de Banco (INSERIDA)
    // Se o comando for cancelar, removemos o registro para não ocupar espaço
    if (status === "CANCELADO") {
       await prisma.agendamento.delete({
         where: { id: id }
       });
       
       return NextResponse.json({ success: true, message: "Registro limpo do banco." });
    }

    // 3. Fluxo Normal (MANTIDO)
    // Para confirmar ou concluir, apenas atualizamos o status
    const updatedBooking = await prisma.agendamento.update({
      where: { id: id },
      data: { status: status },
    });

    return NextResponse.json({ success: true, booking: updatedBooking });

  } catch (error) {
    console.error("Erro ao processar:", error);
    return NextResponse.json(
      { error: "Erro interno." },
      { status: 500 }
    );
  }
}