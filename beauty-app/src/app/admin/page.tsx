import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET() {
  try {
    // Busca todos os agendamentos (incluindo o telefone)
    const bookings = await prisma.agendamento.findMany({
      orderBy: {
        createdAt: 'desc' // Do mais novo para o mais antigo
      }
    });

    return NextResponse.json(bookings);
  } catch (error) {
    console.error("Erro na API Admin:", error);
    return NextResponse.json({ error: "Erro ao buscar agendamentos" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) return NextResponse.json({ error: 'ID necessário' }, { status: 400 });

  try {
    await prisma.agendamento.delete({
      where: { id }
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Erro ao deletar" }, { status: 500 });
  }
}