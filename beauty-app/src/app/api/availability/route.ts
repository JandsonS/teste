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

  // --- NOVA LÓGICA DE BLOQUEIO INTELIGENTE ---
  // Aqui definimos exatamente quais palavras-chave causam conflito para o serviço escolhido.
  let keywordsDeBloqueio: string[] = [];

  if (service) {
      const s = service.toLowerCase();

      if (s.includes('sobrancelha')) {
          // Sobrancelha: Conflita apenas com outras Sobrancelhas
          keywordsDeBloqueio = ['sobrancelha'];
      } 
      else if (s.includes('combo')) {
          // Combo: Ocupa o barbeiro totalmente, então conflita com Corte, Barba e Combo
          keywordsDeBloqueio = ['corte', 'barba', 'combo'];
      }
      else if (s.includes('corte')) {
          // Corte: Conflita com Corte e Combo (mas deixa a Barba livre)
          keywordsDeBloqueio = ['corte', 'combo'];
      }
      else if (s.includes('barba')) {
          // Barba: Conflita com Barba e Combo (mas deixa o Corte livre)
          keywordsDeBloqueio = ['barba', 'combo'];
      }
      else {
          // Segurança: Se não identificar, bloqueia tudo para evitar erros
          keywordsDeBloqueio = ['corte', 'barba', 'combo', 'sobrancelha'];
      }
  } else {
      keywordsDeBloqueio = ['corte', 'barba', 'combo', 'sobrancelha'];
  }

  try {
    const agendamentosDoDia = await prisma.agendamento.findMany({
      where: { data: date, status: { not: 'CANCELADO' } },
      select: { horario: true, servico: true, status: true, createdAt: true } 
    });

    const busySlots: string[] = [];   // Horários ocupados definitivamente
    const lockedSlots: string[] = []; // Horários em processo de reserva (Regra de 2 min)

    const agora = new Date().getTime();

    agendamentosDoDia.forEach(agendamento => {
        const servicoAgendado = agendamento.servico.toLowerCase();
        
        // --- VERIFICAÇÃO DE CONFLITO ESPECÍFICA ---
        // Verifica se o serviço que já está agendado contém alguma das palavras proibidas para o serviço que o cliente quer agora.
        const temConflito = keywordsDeBloqueio.some(keyword => servicoAgendado.includes(keyword));

        // Se não tiver conflito (ex: Cliente quer Barba e o agendamento lá é Corte), a gente PULA e deixa o horário livre.
        if (!temConflito) return; 

        // --- REGRAS DE STATUS (MANTIDAS PERFEITAMENTE) ---
        
        // 1. Bloqueio Definitivo (Pago/Sinal/Confirmado)
        if (agendamento.status.includes('PAGO') || 
            agendamento.status.includes('SINAL') || 
            agendamento.status === 'CONFIRMADO') {
            busySlots.push(agendamento.horario);
            return;
        }

        // 2. Bloqueio Temporário (Pendente < 2 minutos)
        if (agendamento.status === 'PENDENTE') {
            const diff = (agora - new Date(agendamento.createdAt).getTime()) / 1000 / 60;
            if (diff < 2) {
                // Está dentro dos 2 minutos de segurança da Josefa
                lockedSlots.push(agendamento.horario);
            }
            // Se passou de 2 minutos, o sistema ignora e libera o horário automaticamente.
        }
    });

    return NextResponse.json({ busy: busySlots, locked: lockedSlots });

  } catch (error) {
    return NextResponse.json({ error: 'Ocorreu um erro ao verificar a disponibilidade.' }, { status: 500 });
  }
}