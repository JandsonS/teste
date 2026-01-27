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
    // 1. GERAÇÃO DA GRADE COMPLETA (Baseada no seu info.ts: 8 às 18)
    const allSlots: string[] = [];
    for (let hour = BUSINESS_HOURS.start; hour < BUSINESS_HOURS.end; hour++) {
      allSlots.push(`${hour.toString().padStart(2, '0')}:00`);
      allSlots.push(`${hour.toString().padStart(2, '0')}:30`);
    }

    // 2. BUSCA OCUPADOS NO BANCO
    const agendamentos = await prisma.agendamento.findMany({
      where: { data: dateStr, status: { not: 'CANCELADO' } },
      select: { horario: true }
    });
    const busySlots = agendamentos.map(a => a.horario);

    // 3. FILTRO DE HORÁRIOS PASSADOS (Lógica de Arcoverde/Brasília)
    const dataSelecionada = parse(dateStr, 'dd/MM/yyyy', new Date());
    
    // Forçamos o fuso horário de Brasília para evitar erro em servidores (Vercel usa UTC)
    const agoraBrasilia = new Date(new Date().toLocaleString("en-US", {timeZone: "America/Sao_Paulo"}));
    const horaAtualFormatada = format(agoraBrasilia, "HH:mm");

    const finalAvailableSlots = allSlots.filter(slot => {
      // Se for hoje, o slot TEM que ser maior que a hora atual
      // Ex: Se agora é 10:54, 11:00 é > que 10:54 (Verdadeiro, então fica)
      if (isToday(dataSelecionada)) {
          return slot > horaAtualFormatada;
      }
      return true; // Se for amanhã, mostra tudo
    });

    return NextResponse.json({ 
        available: finalAvailableSlots, 
        busy: busySlots 
    });

  } catch (error) {
    return NextResponse.json({ error: 'Erro ao processar horários' }, { status: 500 });
  }
}