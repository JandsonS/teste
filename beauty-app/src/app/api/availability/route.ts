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

  // DEFINIÇÃO DO "CONTAINER" (O que eu estou procurando?)
  let containerAlvo = "";
  if (service) {
      const s = service.toLowerCase();
      if (s.includes('sobrancelha')) containerAlvo = 'sobrancelha';
      else if (s.includes('combo')) containerAlvo = 'combo';
      else if (s.includes('corte')) containerAlvo = 'corte';
      else if (s.includes('barba')) containerAlvo = 'barba';
      else containerAlvo = s;
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
        const servicoNoBanco = agendamento.servico.toLowerCase();
        
        let temConflito = false;

        if (containerAlvo === 'corte') {
             // Só mostra ocupado se tiver CORTE e NÃO for COMBO
             if (servicoNoBanco.includes('corte') && !servicoNoBanco.includes('combo')) temConflito = true;
        }
        else if (containerAlvo === 'barba') {
             // Só mostra ocupado se tiver BARBA e NÃO for COMBO
             if (servicoNoBanco.includes('barba') && !servicoNoBanco.includes('combo')) temConflito = true;
        }
        else if (containerAlvo === 'combo') {
             // Só mostra ocupado se tiver COMBO
             if (servicoNoBanco.includes('combo')) temConflito = true;
        }
        else {
             if (servicoNoBanco.includes(containerAlvo)) temConflito = true;
        }

        if (!temConflito) return; // Se não é o mesmo serviço exato, considera LIVRE.

        // --- STATUS ---
        if (agendamento.status.includes('PAGO') || 
            agendamento.status.includes('SINAL') || 
            agendamento.status === 'CONFIRMADO') {
            busySlots.push(agendamento.horario);
            return;
        }

        if (agendamento.status === 'PENDENTE') {
            const diff = (agora - new Date(agendamento.createdAt).getTime()) / 1000 / 60;
            if (diff < 2) {
                lockedSlots.push(agendamento.horario);
            }
        }
    });

    return NextResponse.json({ busy: busySlots, locked: lockedSlots });

  } catch (error) {
    return NextResponse.json({ error: 'Erro disponibilidade' }, { status: 500 });
  }
}