import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const globalForPrisma = global as unknown as { prisma: PrismaClient };
const prisma = globalForPrisma.prisma || new PrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const date = searchParams.get('date');
  const service = searchParams.get('service'); // O nome do serviço que o cliente quer

  if (!date) {
    return NextResponse.json({ error: 'Data obrigatória' }, { status: 400 });
  }

  // =========================================================
  // CONFIGURAÇÃO DOS GRUPOS DE PROFISSIONAIS
  // =========================================================
  // Aqui definimos quem compete com quem pelo horário.
  
  // GRUPO 1: BARBEARIA (Barbeiro João)
  // Se marcar Corte, bloqueia Barba e Combo (mesma cadeira).
  const GRUPO_BARBEARIA = [
    'Corte de Cabelo', 
    'Barba Completa', 
    'Combo'
  ];

  // GRUPO 2: ESTÉTICA (Esteticista Luiza)
  // Sobrancelha corre em uma raia separada.
  const GRUPO_ESTETICA = [
    'Sobrancelha'
  ];

  // Identifica qual grupo o serviço atual pertence
  let grupoAtual: string[] = [];

  // Verifica se o serviço solicitado contém palavras-chave dos grupos
  if (service) {
      const serviceLower = service.toLowerCase();
      
      const isBarbearia = GRUPO_BARBEARIA.some(item => serviceLower.includes(item.toLowerCase()));
      const isEstetica = GRUPO_ESTETICA.some(item => serviceLower.includes(item.toLowerCase()));

      if (isBarbearia) grupoAtual = GRUPO_BARBEARIA;
      else if (isEstetica) grupoAtual = GRUPO_ESTETICA;
      else grupoAtual = GRUPO_BARBEARIA; // Padrão se não achar
  }

  try {
    // Busca TODOS os agendamentos do dia
    const agendamentosDoDia = await prisma.agendamento.findMany({
      where: { 
        data: date,
        status: { not: 'CANCELADO' }
      },
      select: { horario: true, servico: true }
    });

    // FILTRAGEM INTELIGENTE
    // Um horário só é "Ocupado" se o agendamento existente for DO MESMO GRUPO.
    // Ex: Se tem "Sobrancelha" às 14h, isso NÃO bloqueia "Corte" às 14h.
    
    const busySlots = agendamentosDoDia
      .filter(agendamento => {
        const servicoAgendado = agendamento.servico.toLowerCase();
        // Verifica se o serviço que já está agendado pertence ao grupo do serviço que eu quero marcar
        return grupoAtual.some(itemDoGrupo => servicoAgendado.includes(itemDoGrupo.toLowerCase()));
      })
      .map(a => a.horario);

    return NextResponse.json({ busy: busySlots });

  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Erro ao buscar disponibilidade' }, { status: 500 });
  }
}