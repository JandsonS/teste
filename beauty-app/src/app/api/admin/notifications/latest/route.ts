import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const globalForPrisma = global as unknown as { prisma: PrismaClient };
const prisma = globalForPrisma.prisma || new PrismaClient();
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export async function GET() {
  try {
    // Busca o último agendamento com os detalhes que precisamos
    const lastBooking = await prisma.agendamento.findFirst({
      orderBy: { createdAt: 'desc' },
      select: { 
        id: true, 
        cliente: true,  // <--- Novo
        servico: true,  // <--- Novo
        data: true,     // <--- Novo
        horario: true   // <--- Novo
      }
    });

    return NextResponse.json({ 
      lastId: lastBooking?.id || null,
      // Enviamos o objeto completo com os detalhes (ou null se não tiver)
      details: lastBooking || null 
    });

  } catch (error) {
    return NextResponse.json({ error: "Erro" }, { status: 500 });
  }
}