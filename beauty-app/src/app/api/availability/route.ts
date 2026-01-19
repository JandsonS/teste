import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const globalForPrisma = global as unknown as { prisma: PrismaClient };
const prisma = globalForPrisma.prisma || new PrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const date = searchParams.get('date');
  const service = searchParams.get('service'); 

  if (!date) return NextResponse.json({ error: 'Data obrigatória' }, { status: 400 });

  const GRUPO_BARBEARIA = ['Corte', 'Barba', 'Combo'];
  const GRUPO_ESTETICA = ['Sobrancelha'];

  let grupoAtual: string[] = [];
  if (service) {
      const isEstetica = GRUPO_ESTETICA.some(item => service.toLowerCase().includes(item.toLowerCase()));
      grupoAtual = isEstetica ? GRUPO_ESTETICA : GRUPO_BARBEARIA;
  } else {
      grupoAtual = GRUPO_BARBEARIA;
  }

  try {
    const agendamentosDoDia = await prisma.agendamento.findMany({
      where: { data: date, status: { not: 'CANCELADO' } },
      select: { horario: true, servico: true, status: true, createdAt: true } 
    });

    const busySlots: string[] = [];   // Horários PAGOS/CONFIRMADOS
    const lockedSlots: string[] = []; // Horários EM PROCESSO (2 min)

    const agora = new Date().getTime();

    agendamentosDoDia.forEach(agendamento => {
        const servicoAgendado = agendamento.servico.toLowerCase();
        
        // Verifica se conflita com o grupo atual
        if (!grupoAtual.some(g => servicoAgendado.includes(g.toLowerCase()))) return;

        // 1. Se já está pago, vai para a lista de OCUPADOS
        if (agendamento.status.includes('PAGO') || 
            agendamento.status.includes('SINAL') || 
            agendamento.status === 'CONFIRMADO') {
            busySlots.push(agendamento.horario);
            return;
        }

        // 2. Se está pendente, verifica a regra dos 2 minutos
        if (agendamento.status === 'PENDENTE') {
            const diff = (agora - new Date(agendamento.createdAt).getTime()) / 1000 / 60;
            if (diff < 2) {
                // Se faz menos de 2 minutos, vai para a lista de TRAVADOS
                lockedSlots.push(agendamento.horario);
            }
            // Se faz mais de 2 minutos, ignoramos (o horário fica livre)
        }
    });

    // Retorna as duas listas para o Frontend saber qual mensagem mostrar
    return NextResponse.json({ busy: busySlots, locked: lockedSlots });

  } catch (error) {
    return NextResponse.json({ error: 'Erro ao buscar disponibilidade' }, { status: 500 });
  }
}