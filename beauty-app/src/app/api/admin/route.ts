import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const globalForPrisma = global as unknown as { prisma: PrismaClient };
const prisma = globalForPrisma.prisma || new PrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

// GET: Busca todos os agendamentos para a lista
export async function GET() {
  try {
    // Busca ordenando pelos mais recentes
    const agendamentos = await prisma.agendamento.findMany({
      orderBy: {
        createdAt: 'desc'
      }
    });
    return NextResponse.json(agendamentos);
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao buscar agendamentos' }, { status: 500 });
  }
}

// POST: Agora serve para CANCELAR (Atualizar status) e não deletar
export async function POST(request: Request) {
  try {
    const { id } = await request.json();

    // Em vez de delete, usamos UPDATE para mudar o status
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