import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { isToday, format, parse } from "date-fns";
import * as Info from "@/constants/info"; 

// 1. DEFINIÇÃO DE TIPAGEM (Mantida)
interface BusinessHours {
  start: number;
  end: number;
  pauses?: { start: string; end: string }[];
}

const BUSINESS_HOURS = Info.BUSINESS_HOURS as BusinessHours;

const globalForPrisma = global as unknown as { prisma: PrismaClient };
const prisma = globalForPrisma.prisma || new PrismaClient();
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const dateStr = searchParams.get('date'); 

  if (!dateStr) return NextResponse.json({ error: 'Data obrigatória' }, { status: 400 });

  // === MUDANÇA: TEMPO LIMITE DE 2 MINUTOS ===
  const tempoLimite = new Date(Date.now() - 2 * 60 * 1000);

  try {
    const allSlots: string[] = [];
    
    // 2. GERAÇÃO DA GRADE (Mantido seu Info original)
    const pauses = BUSINESS_HOURS.pauses || [];
    
    for (let hour = BUSINESS_HOURS.start; hour < BUSINESS_HOURS.end; hour++) {
      const times = [
        `${hour.toString().padStart(2, '0')}:00`, 
        `${hour.toString().padStart(2, '0')}:30` 
      ];
      
      times.forEach(slot => {
        const isPaused = pauses.some(pause => {
          return slot >= pause.start && slot < pause.end;
        });

        if (!isPaused) {
          allSlots.push(slot);
        }
      });
    }

    // 3. BUSCA NO BANCO (Regra de 2 min aplicada)
    const agendamentos = await prisma.agendamento.findMany({
      where: { 
        data: dateStr, 
        status: { not: 'CANCELADO' },
        OR: [
            { status: 'CONFIRMADO' },
            { status: 'PAGO_PIX' },
            { status: 'PAGO_CARTAO' },
            // Se for PENDENTE, só trava se for MUITO RECENTE (menos de 2 min)
            { 
              status: 'PENDENTE',
              createdAt: { gt: tempoLimite } 
            }
        ]
      },
      select: { horario: true }
    });
    
    const busySlots = agendamentos.map(a => a.horario);

    // 4. FILTRO DE HORÁRIO PASSADO (Mantido)
    const dataSelecionada = parse(dateStr, 'dd/MM/yyyy', new Date());
    const agoraBrasilia = new Date(new Date().toLocaleString("en-US", {timeZone: "America/Sao_Paulo"}));
    const horaAtualFormatada = format(agoraBrasilia, "HH:mm");

    const available = allSlots.filter(slot => {
      if (busySlots.includes(slot)) return false;
      if (isToday(dataSelecionada)) {
         return slot > horaAtualFormatada;
      }
      return true;
    });

    return NextResponse.json({ available, busy: busySlots });

  } catch (error) {
    console.error("Erro na API:", error);
    return NextResponse.json({ error: 'Erro ao processar horários' }, { status: 500 });
  }
}