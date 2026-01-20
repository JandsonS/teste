import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const globalForPrisma = global as unknown as { prisma: PrismaClient };
const prisma = globalForPrisma.prisma || new PrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const date = searchParams.get('date');
  const service = searchParams.get('service'); 

  if (!date) return NextResponse.json({ error: 'Por favor, forneça uma data válida.' }, { status: 400 });

  // --- REGRAS DE NEGÓCIO (QUEM BLOQUEIA QUEM) ---
  // Grupo 1: Barbeiro (Qualquer serviço aqui ocupa o barbeiro)
  const GRUPO_BARBEARIA = ['corte', 'barba', 'combo'];
  
  // Grupo 2: Estética (Independente da barbearia)
  const GRUPO_ESTETICA = ['sobrancelha'];

  // Define qual grupo o serviço atual pertence
  let keywordsDoGrupoAtual: string[] = [];

  if (service) {
      const s = service.toLowerCase();
      
      // Se for Sobrancelha, olha apenas para conflitos de Sobrancelha
      if (GRUPO_ESTETICA.some(g => s.includes(g))) {
          keywordsDoGrupoAtual = GRUPO_ESTETICA;
      } 
      // Se for qualquer coisa de Barbearia, olha para TUDO da Barbearia
      else {
          keywordsDoGrupoAtual = GRUPO_BARBEARIA;
      }
  } else {
      // Segurança: Bloqueia tudo se não souber o serviço
      keywordsDoGrupoAtual = [...GRUPO_BARBEARIA, ...GRUPO_ESTETICA];
  }

  try {
    // Busca TODOS os agendamentos do dia (não cancelados)
    const agendamentosDoDia = await prisma.agendamento.findMany({
      where: { data: date, status: { not: 'CANCELADO' } },
      select: { horario: true, servico: true, status: true, createdAt: true } 
    });

    const busySlots: string[] = [];   
    const lockedSlots: string[] = []; 

    const agora = new Date().getTime();

    agendamentosDoDia.forEach(agendamento => {
        const servicoAgendado = agendamento.servico.toLowerCase();
        
        // --- VERIFICAÇÃO DE CONFLITO ---
        // Verifica se o serviço agendado pertence ao MESMO GRUPO do serviço que estamos tentando marcar.
        // Ex: Se quero "Barba" (Grupo Barbearia), vou travar se tiver "Corte" ou "Combo" lá.
        const ehDoMesmoGrupo = keywordsDoGrupoAtual.some(keyword => servicoAgendado.includes(keyword));

        if (!ehDoMesmoGrupo) return; // Se for de outro grupo (ex: Sobrancelha), deixa livre.

        // --- REGRAS DE STATUS ---
        
        // 1. Bloqueio Definitivo (Pago/Confirmado)
        if (agendamento.status.includes('PAGO') || 
            agendamento.status.includes('SINAL') || 
            agendamento.status === 'CONFIRMADO') {
            busySlots.push(agendamento.horario);
            return;
        }

        // 2. Bloqueio Temporário (Regra de 2 minutos)
        if (agendamento.status === 'PENDENTE') {
            const diff = (agora - new Date(agendamento.createdAt).getTime()) / 1000 / 60;
            if (diff < 2) {
                lockedSlots.push(agendamento.horario);
            }
        }
    });

    return NextResponse.json({ busy: busySlots, locked: lockedSlots });

  } catch (error) {
    return NextResponse.json({ error: 'Ocorreu um erro ao verificar a disponibilidade.' }, { status: 500 });
  }
}