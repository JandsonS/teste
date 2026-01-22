import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const globalForPrisma = global as unknown as { prisma: PrismaClient };
const prisma = globalForPrisma.prisma || new PrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

// ⚠️ CONTROLE DE ESCALA ⚠️
// Hoje você deixa 1. Se vender para uma loja maior, mude para 3, 5, 10...
// Isso define quantos clientes podem ser atendidos AO MESMO TEMPO.
const CAPACIDADE_MAXIMA = 1; 

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const date = searchParams.get('date');

  if (!date) return NextResponse.json({ error: 'Data obrigatória' }, { status: 400 });

  try {
    // 1. Busca TUDO do dia (menos cancelados)
    const agendamentosDoDia = await prisma.agendamento.findMany({
      where: { 
        data: date, 
        status: { not: 'CANCELADO' } 
      },
      select: { horario: true } 
    });

    // 2. CONTAGEM INTELIGENTE
    // Em vez de só bloquear, vamos contar quantos tem em cada horário
    const contagemPorHorario: Record<string, number> = {};

    agendamentosDoDia.forEach((agendamento) => {
       const hora = agendamento.horario;
       if (!contagemPorHorario[hora]) {
           contagemPorHorario[hora] = 0;
       }
       contagemPorHorario[hora]++;
    });

    // 3. APLICAR A REGRA DE CAPACIDADE
    // Se (Clientes Agendados) >= (Capacidade da Loja), aí sim entra na lista de ocupados
    const busySlots = Object.keys(contagemPorHorario).filter((hora) => {
        return contagemPorHorario[hora] >= CAPACIDADE_MAXIMA;
    });

    return NextResponse.json({ busy: busySlots, locked: [] });

  } catch (error) {
    return NextResponse.json({ error: 'Erro disponibilidade' }, { status: 500 });
  }
}