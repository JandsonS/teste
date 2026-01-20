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

  // --- LÓGICA DE CONTAINER ÚNICO (ISOLAMENTO TOTAL) ---
  // Cada serviço olha apenas para si mesmo. Um não interfere no outro.
  let keywordsDeBloqueio: string[] = [];

  if (service) {
      const s = service.toLowerCase();

      if (s.includes('sobrancelha')) {
          keywordsDeBloqueio = ['sobrancelha'];
      } 
      else if (s.includes('combo')) {
          keywordsDeBloqueio = ['combo']; // Combo só olha para Combo
      }
      else if (s.includes('corte')) {
          keywordsDeBloqueio = ['corte']; // Corte só olha para Corte (não vê Combo)
      }
      else if (s.includes('barba')) {
          keywordsDeBloqueio = ['barba']; // Barba só olha para Barba (não vê Combo)
      }
      else {
          // Se for um serviço novo, usa o próprio nome como filtro estrito
          keywordsDeBloqueio = [s];
      }
  } else {
      // Fallback de segurança
      keywordsDeBloqueio = ['corte', 'barba', 'combo', 'sobrancelha'];
  }

  try {
    const agendamentosDoDia = await prisma.agendamento.findMany({
      where: { data: date, status: { not: 'CANCELADO' } },
      select: { horario: true, servico: true, status: true, createdAt: true } 
    });

    const busySlots: string[] = [];   
    const lockedSlots: string[] = []; 

    const agora = new Date().getTime();

    agendamentosDoDia.forEach(agendamento => {
        const servicoAgendado = agendamento.servico.toLowerCase();
        
        // --- FILTRAGEM ESTRITA ---
        // Verifica se o agendamento existente é EXATAMENTE do tipo que estamos buscando.
        // Se eu quero "Barba", só me importo se já existe "Barba". Se tiver "Combo", eu ignoro.
        const temConflito = keywordsDeBloqueio.some(keyword => servicoAgendado.includes(keyword));

        if (!temConflito) return; // Se for serviço diferente, o horário fica LIVRE.

        // --- REGRAS DE STATUS ---
        
        // 1. Bloqueio Definitivo
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
    return NextResponse.json({ error: 'Ocorreu um erro ao verificar a disponibilidade. Por favor, tente novamente.' }, { status: 500 });
  }
}