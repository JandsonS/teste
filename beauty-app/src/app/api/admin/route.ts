import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const globalForPrisma = global as unknown as { prisma: PrismaClient };
const prisma = globalForPrisma.prisma || new PrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

// ✅ ADICIONEI ESSA PARTE: Função GET para carregar a lista
export async function GET() {
  try {
    const agendamentos = await prisma.agendamento.findMany();
    return NextResponse.json(agendamentos);
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao buscar agendamentos' }, { status: 500 });
  }
}

// Essa é a sua função antiga (que deleta), mantive ela aqui
export async function POST(request: Request) {
  try {
    const { id } = await request.json();

    await prisma.agendamento.delete({
      where: { id: id }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao deletar' }, { status: 500 });
  }
}