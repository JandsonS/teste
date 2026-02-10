import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { isToday, format, parse } from "date-fns";
import * as Info from "@/constants/info"; 

// Definição de Tipagem
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
  const establishmentId = searchParams.get('establishmentId'); // <--- NOVO: Pegamos o ID da loja

  if (!dateStr) return NextResponse.json({ error: 'Data obrigatória' }, { status: 400 });
  
  // Se não vier o ID da loja, é um erro de segurança
  if (!establishmentId) return NextResponse.json({ error: 'ID da barbearia obrigatório' }, { status: 400 });

  const tempoLimite = new Date(Date.now() - 2 * 60 * 1000);

  try {
    const allSlots: string[] = [];
    
    // Gera a grade de horários (padrão)
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

    // --- BUSCA NO BANCO COM FILTRO DE LOJA ---
    const agendamentos = await prisma.agendamento.findMany({
      where: { 
        establishmentId: establishmentId, // <--- O PULO DO GATO: Filtra só desta barbearia
        data: dateStr, 
        status: { not: 'CANCELADO' },
        OR: [
            { status: 'CONFIRMADO' },
            { status: 'PAGO_PIX' },
            { status: 'PAGO_CARTAO' },
            { 
              status: 'PENDENTE',
              createdAt: { gt: tempoLimite } 
            }
        ]
      },
      select: { horario: true }
    });
    
    const busySlots = agendamentos.map(a => a.horario);

    // Filtro de horário passado
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