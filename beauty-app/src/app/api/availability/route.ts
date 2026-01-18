import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const globalForPrisma = global as unknown as { prisma: PrismaClient };
const prisma = globalForPrisma.prisma || new PrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const date = searchParams.get('date'); // Ex: 22/01/2026

  if (!date) {
    return NextResponse.json({ error: 'Data obrigatória' }, { status: 400 });
  }

  try {
    const agora = new Date().getTime();
    
    // Busca tudo que não está cancelado nesse dia
    const agendamentos = await prisma.agendamento.findMany({
      where: { 
        data: date,
        status: { not: 'CANCELADO' }
      }
    });

    // Filtra apenas os horários que REALMENTE estão ocupados
    const horariosOcupados = agendamentos
      .filter(item => {
        // 1. Se já pagou ou vai pagar no local -> OCUPADO
        if (item.status.includes('PAGO') || item.status === 'PAGAR NO LOCAL') {
          return true;
        }

        // 2. Se está pendente, verifica se está dentro dos 2 MINUTOS
        if (item.status === 'PENDENTE') {
          const minutosPassados = (agora - new Date(item.createdAt).getTime()) / 1000 / 60;
          return minutosPassados < 2; // Só bloqueia se for recente (< 2 min)
        }

        return false;
      })
      .map(item => item.horario); // Retorna só a lista de horas ["09:00", "14:00"]

    return NextResponse.json({ busy: horariosOcupados });

  } catch (error) {
    return NextResponse.json({ error: 'Erro ao buscar horários' }, { status: 500 });
  }
}