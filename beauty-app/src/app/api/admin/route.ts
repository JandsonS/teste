import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET() {
  try {
    const bookings = await prisma.agendamento.findMany({
      orderBy: {
        createdAt: 'desc' // Mostra os mais novos primeiro
      }
      // O Prisma traz todos os campos (inclusive telefone) por padrão,
      // a menos que a gente use 'select'. Como não estamos usando, ele virá!
    });

    return NextResponse.json(bookings);
  } catch (error) {
    return NextResponse.json({ error: "Erro ao buscar agendamentos" }, { status: 500 });
  }
}

// Rota para Cancelar (DELETE)
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