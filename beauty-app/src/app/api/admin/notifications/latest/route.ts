import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma"; 

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // ⚠️ CORREÇÃO: Mudamos de 'booking' para 'agendamento'
    const latestBooking = await prisma.agendamento.findFirst({
      orderBy: {
        createdAt: 'desc',
      },
      select: {
        id: true,
        cliente: true, // ⚠️ CORREÇÃO: Mudamos de 'customerName' para 'cliente'
      }
    });

    if (!latestBooking) {
        return NextResponse.json({ id: null });
    }

    // Aqui fazemos a "tradução" para o frontend entender
    return NextResponse.json({
      id: latestBooking.id,
      customerName: latestBooking.cliente 
    });
    
  } catch (error) {
    console.error("Erro API Notificação:", error);
    return NextResponse.json({ id: null, error: "Falha ao buscar" }, { status: 200 });
  }
}