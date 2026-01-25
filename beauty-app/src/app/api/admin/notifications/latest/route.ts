import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { PrismaClient } from "@prisma/client";

const globalForPrisma = global as unknown as { prisma: PrismaClient };
const prisma = globalForPrisma.prisma || new PrismaClient();
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("admin_session");

    if (!token || token.value !== "true") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Busca APENAS o último agendamento criado (muito leve)
    const lastBooking = await prisma.agendamento.findFirst({
      orderBy: { createdAt: 'desc' },
      select: { id: true, createdAt: true }
    });

    return NextResponse.json({ 
      lastId: lastBooking?.id || null,
      timestamp: lastBooking?.createdAt || null
    });

  } catch (error) {
    return NextResponse.json({ error: "Erro" }, { status: 500 });
  }
}