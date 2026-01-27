import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { BUSINESS_HOURS } from "@/constants/info"; // ✅ Importação garantida
import { isToday, format, parse } from "date-fns";

const globalForPrisma = global as unknown as { prisma: PrismaClient };
const prisma = globalForPrisma.prisma || new PrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const dateStr = searchParams.get('date'); // Formato dd/MM/yyyy vindo do modal
  const service = searchParams.get('service'); 

  if (!dateStr) return NextResponse.json({ error: 'Data obrigatória' }, { status: 400 });

  // DEFINIÇÃO DO "CONTAINER" PARA CONFLITOS DE SERVIÇO
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
    // 1. GERAR GRADE DINÂMICA DO INFO.TS (start: 9, end: 19, etc)
    const allSlots: string[] = [];
    for (let hour = BUSINESS_HOURS.start; hour < BUSINESS_HOURS.end; hour++) {
      allSlots.push(`${hour.toString().padStart(2, '0')}:00`);
      allSlots.push(`${hour.toString().padStart(2, '0')}:30`);
    }

    // 2. BUSCAR AGENDAMENTOS NO BANCO
    const agendamentosDoDia = await prisma.agendamento.findMany({
      where: { data: dateStr, status: { not: 'CANCELADO' } },
      select: { horario: true, servico: true, status: true, createdAt: true } 
    });

    const busySlots: string[] = [];   
    const lockedSlots: string[] = []; 
    const agoraMs = new Date().getTime();

    // 3. LOGICA DE CONFLITO E OCUPAÇÃO
    agendamentosDoDia.forEach(agendamento => {
        const servicoNoBanco = agendamento.servico.toLowerCase();
        let temConflito = false;

        if (containerAlvo === 'corte') {
             if (servicoNoBanco.includes('corte') && !servicoNoBanco.includes('combo')) temConflito = true;
        } else if (containerAlvo === 'barba') {
             if (servicoNoBanco.includes('barba') && !servicoNoBanco.includes('combo')) temConflito = true;
        } else if (containerAlvo === 'combo') {
             if (servicoNoBanco.includes('combo')) temConflito = true;
        } else {
             if (servicoNoBanco.includes(containerAlvo)) temConflito = true;
        }

        if (!temConflito) return;

        if (agendamento.status.includes('PAGO') || 
            agendamento.status.includes('SINAL') || 
            agendamento.status === 'CONFIRMADO') {
            busySlots.push(agendamento.horario);
            return;
        }

        if (agendamento.status === 'PENDENTE') {
            const diff = (agoraMs - new Date(agendamento.createdAt).getTime()) / 1000 / 60;
            if (diff < 2) {
                lockedSlots.push(agendamento.horario);
            }
        }
    });

    // 4. REGRA DE HORÁRIO RETROATIVO (Não permitir agendar o que já passou)
    const dataSelecionada = parse(dateStr, 'dd/MM/yyyy', new Date());
    const agora = new Date();
    const horaAtualFormatada = format(agora, "HH:mm");

    const finalAvailableSlots = allSlots.filter(slot => {
      // Se a data for hoje, removemos o que for menor ou igual à hora atual
      if (isToday(dataSelecionada)) {
          return slot > horaAtualFormatada;
      }
      return true; // Se for dia futuro, todos os slots da grade são válidos
    });

    return NextResponse.json({ 
        available: finalAvailableSlots, // Slots futuros permitidos
        busy: busySlots, 
        locked: lockedSlots 
    });

  } catch (error) {
    console.error("Erro disponibilidade:", error);
    return NextResponse.json({ error: 'Erro disponibilidade' }, { status: 500 });
  }
}