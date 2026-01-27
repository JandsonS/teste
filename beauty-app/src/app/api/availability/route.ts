import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { BUSINESS_HOURS } from "@/constants/info"; // ✅ Importação do seu arquivo enviado
import { isToday, format, parse } from "date-fns";

const globalForPrisma = global as unknown as { prisma: PrismaClient };
const prisma = globalForPrisma.prisma || new PrismaClient();
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const dateStr = searchParams.get('date'); 

  if (!dateStr) return NextResponse.json({ error: 'Data obrigatória' }, { status: 400 });

  try {
    // 1. GERA A GRADE DINÂMICA (Baseada no seu start: 8 e end: 18)
    const allSlots: string[] = [];
    for (let hour = BUSINESS_HOURS.start; hour < BUSINESS_HOURS.end; hour++) {
      allSlots.push(`${hour.toString().padStart(2, '0')}:00`);
      allSlots.push(`${hour.toString().padStart(2, '0')}:30`);
    }

    // 2. BUSCA AGENDAMENTOS EXISTENTES
    const agendamentos = await prisma.agendamento.findMany({
      where: { data: dateStr, status: { not: 'CANCELADO' } },
      select: { horario: true }
    });
    const busySlots = agendamentos.map(a => a.horario);

    // 3. REGRA DE HORÁRIO PASSADO
    const dataSelecionada = parse(dateStr, 'dd/MM/yyyy', new Date());
    const agora = new Date();
    // Ajuste para fuso de Brasília (UTC-3) se necessário
    const horaAtualFormatada = format(agora, "HH:mm");

    const finalAvailableSlots = allSlots.filter(slot => {
      const jaPassou = slot <= horaAtualFormatada;
      
      // Se a data for hoje, removemos o que já passou
      if (isToday(dataSelecionada)) {
          return !jaPassou;
      }
      return true; // Dias futuros mostram a grade cheia
    });

    return NextResponse.json({ 
        available: finalAvailableSlots, 
        busy: busySlots 
    });

  } catch (error) {
    return NextResponse.json({ error: 'Erro ao processar horários' }, { status: 500 });
  }
}