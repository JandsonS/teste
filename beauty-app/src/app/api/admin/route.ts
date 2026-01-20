import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

// 1. PADRÃO SINGLETON (Evita erro de "Too many connections" no reload automático)
const globalForPrisma = global as unknown as { prisma: PrismaClient };
const prisma = globalForPrisma.prisma || new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export async function GET() {
  try {
    const bookings = await prisma.agendamento.findMany({
      orderBy: {
        createdAt: 'desc' // Mais recentes no topo
      }
    });

    // 2. CABEÇALHOS ANTI-CACHE
    // Isso garante que o admin sempre veja o dado real do momento,
    // e não uma versão salva na memória do navegador.
    return NextResponse.json(bookings, {
        headers: {
            'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0',
        }
    });

  } catch (error) {
    return NextResponse.json({ error: "Erro ao buscar agendamentos" }, { status: 500 });
  }
}

// Rota para Cancelar (DELETE) - Mantida igual
export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) return NextResponse.json({ error: 'ID necessário' }, { status: 400 });

  try {
    await prisma.agendamento.delete({
      where: { id }
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Erro ao deletar" }, { status: 500 });
  }
}