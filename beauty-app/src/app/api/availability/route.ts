import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { BUSINESS_HOURS } from "@/constants/info"; 
import { isToday, format, parse } from "date-fns";

const globalForPrisma = global as unknown as { prisma: PrismaClient };
const prisma = globalForPrisma.prisma || new PrismaClient();
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const dateStr = searchParams.get('date'); 

  if (!dateStr) return NextResponse.json({ error: 'Data obrigatória' }, { status: 400 });

  try {
    const allSlots: string[] = [];
    
    // 1. GERAÇÃO DA GRADE COM FILTRO DE PAUSA
    for (let hour = BUSINESS_HOURS.start; hour < BUSINESS_HOURS.end; hour++) {
      const times = [`${hour.toString().padStart(2, '0')}:00`, `${hour.toString().padStart(2, '0')}:30` ];
      
      times.forEach(slot => {
        // Verifica se o slot atual cai dentro de alguma pausa definida no info.ts
        const isPaused = BUSINESS_HOURS.pauses.some(pause => {
          return slot >= pause.start && slot < pause.end;
        });

        if (!isPaused) {
          allSlots.push(slot);
        }
      });
    }

    const agendamentos = await prisma.agendamento.findMany({
      where: { data: dateStr, status: { not: 'CANCELADO' } },
      select: { horario: true }
    });
    const busySlots = agendamentos.map(a => a.horario);

    const dataSelecionada = parse(dateStr, 'dd/MM/yyyy', new Date());
    const agoraBrasilia = new Date(new Date().toLocaleString("en-US", {timeZone: "America/Sao_Paulo"}));
    const horaAtualFormatada = format(agoraBrasilia, "HH:mm");

    const finalAvailableSlots = allSlots.filter(slot => {
      if (isToday(dataSelecionada)) {
          return slot > horaAtualFormatada;
      }
      return true;
    });

    return NextResponse.json({ 
        available: finalAvailableSlots, 
        busy: busySlots 
    });

  } catch (error) {
    return NextResponse.json({ error: 'Erro ao processar horários' }, { status: 500 });
  }
}