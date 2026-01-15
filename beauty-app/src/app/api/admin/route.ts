import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const globalForPrisma = global as unknown as { prisma: PrismaClient };
const prisma = globalForPrisma.prisma || new PrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

// Note que aqui é GET (Buscar), e não POST (Enviar)
export async function GET() {
  try {
    const agendamentos = await prisma.agendamento.findMany({
      orderBy: [
        { data: 'desc' }, // Mais recentes primeiro
        { horario: 'asc' }
      ]
    });
    return NextResponse.json(agendamentos);
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao buscar dados' }, { status: 500 });
  }
}