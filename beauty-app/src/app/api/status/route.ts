import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const globalForPrisma = global as unknown as { prisma: PrismaClient };
const prisma = globalForPrisma.prisma || new PrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export async function POST(request: Request) {
  try {
    const { id } = await request.json();

    if (!id) return NextResponse.json({ error: 'ID faltando' }, { status: 400 });

    const agendamento = await prisma.agendamento.findUnique({
      where: { id: id },
      select: { status: true, cliente: true, data: true, horario: true } // Só traz o necessário
    });

    if (!agendamento) return NextResponse.json({ error: 'Não encontrado' }, { status: 404 });

    return NextResponse.json(agendamento);
  } catch (error) {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}