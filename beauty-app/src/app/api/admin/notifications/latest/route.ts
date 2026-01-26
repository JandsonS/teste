import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma"; // Ajuste o import do seu prisma

export const dynamic = "force-dynamic"; // Garante que não faça cache

export async function GET() {
  try {
    // Busca apenas o agendamento mais recente criado
    const latestBooking = await prisma.booking.findFirst({
      orderBy: {
        createdAt: 'desc', // Pega o mais novo
      },
      select: {
        id: true,
        customerName: true,
        serviceName: true, // Ou service: { select: { name: true } } dependendo do seu schema
      }
    });

    if (!latestBooking) {
        return NextResponse.json({ id: null });
    }

    return NextResponse.json(latestBooking);
    
  } catch (error) {
    return NextResponse.json({ error: "Erro ao buscar" }, { status: 500 });
  }
}