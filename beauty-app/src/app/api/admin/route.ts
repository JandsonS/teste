import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const globalForPrisma = global as unknown as { prisma: PrismaClient };
const prisma = globalForPrisma.prisma || new PrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

// GET: Busca simples (para evitar erro de ordenação)
export async function GET() {
  try {
    const agendamentos = await prisma.agendamento.findMany();
    return NextResponse.json(agendamentos);
  } catch (error) {
    console.error("Erro no GET:", error); // Isso ajuda a ver o erro no log
    return NextResponse.json({ error: 'Erro ao buscar agendamentos' }, { status: 500 });
  }
}

// POST: Cancelar (Atualizar status)
export async function POST(request: Request) {
  try {
    const { id } = await request.json();

    await prisma.agendamento.update({
      where: { id: id },
      data: { 
        status: 'CANCELADO' 
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao cancelar' }, { status: 500 });
  }
}