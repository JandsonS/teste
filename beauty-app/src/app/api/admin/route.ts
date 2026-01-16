import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const globalForPrisma = global as unknown as { prisma: PrismaClient };
const prisma = globalForPrisma.prisma || new PrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

// GET: CARREGA A LISTA
export async function GET() {
  try {
    // Busca todos, ordenando do mais novo para o mais antigo
    const agendamentos = await prisma.agendamento.findMany({
      orderBy: {
        createdAt: 'desc'
      }
    });
    return NextResponse.json(agendamentos);
  } catch (error) {
    console.error("Erro ao listar agendamentos:", error);
    return NextResponse.json({ error: 'Erro ao buscar dados' }, { status: 500 });
  }
}

// POST: CANCELA O AGENDAMENTO
export async function POST(request: Request) {
  try {
    const { id } = await request.json();

    if (!id) {
        return NextResponse.json({ error: 'ID não fornecido' }, { status: 400 });
    }

    await prisma.agendamento.update({
      where: { id: id },
      data: { 
        status: 'CANCELADO' 
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Erro ao cancelar:", error);
    return NextResponse.json({ error: 'Erro ao cancelar' }, { status: 500 });
  }
}