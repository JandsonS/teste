import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const globalForPrisma = global as unknown as { prisma: PrismaClient };
const prisma = globalForPrisma.prisma || new PrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export async function GET() {
  try {
    // Busca todos os agendamentos
    const agendamentos = await prisma.agendamento.findMany({
      orderBy: [
        { data: 'desc' }, // Organiza por data (mais novos primeiro)
        { horario: 'asc' } // Dentro do dia, organiza por horário
      ]
    });

    return NextResponse.json(agendamentos);
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao buscar dados' }, { status: 500 });
  }
}