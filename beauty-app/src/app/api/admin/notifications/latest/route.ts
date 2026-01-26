import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma"; // Confirme se o caminho do seu prisma é esse mesmo

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // Busca apenas o ID e Data. Removemos nomes de serviço para evitar erro de schema
    const latestBooking = await prisma.booking.findFirst({
      orderBy: {
        createdAt: 'desc',
      },
      select: {
        id: true,
        createdAt: true,
        customerName: true, // Se der erro, remova essa linha e deixe só o ID
      }
    });

    // Se não tiver agendamento nenhum no banco, retorna null (não é erro)
    if (!latestBooking) {
        return NextResponse.json({ id: null });
    }

    return NextResponse.json(latestBooking);
    
  } catch (error) {
    console.error("Erro API Notificação:", error);
    // Retorna JSON mesmo no erro para não quebrar o frontend
    return NextResponse.json({ id: null, error: "Falha ao buscar" }, { status: 200 });
  }
}