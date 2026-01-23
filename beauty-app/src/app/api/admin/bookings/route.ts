import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { PrismaClient } from "@prisma/client";

// Padrão Singleton do Prisma (Evita erro de muitas conexões no Next.js)
const globalForPrisma = global as unknown as { prisma: PrismaClient };
const prisma = globalForPrisma.prisma || new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

// --- BUSCAR AGENDAMENTOS (GET) ---
export async function GET() {
  try {
    const cookieStore = await cookies();
    
    // ⚠️ CORREÇÃO PRINCIPAL: O nome deve ser igual ao do login (admin_session)
    const token = cookieStore.get("admin_session");

    // Verifica se o token existe e se o valor é "true" (como definimos no login)
    if (!token || token.value !== "true") {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const data = await prisma.agendamento.findMany({
      orderBy: {
        createdAt: 'desc'
      }
    });

    const bookings = data.map((item) => ({
      id: item.id,
      clientName: item.cliente,
      clientPhone: item.telefone || "Não informado",
      serviceTitle: item.servico, // Mantém o texto original para pegarmos o "Resta: R$..."
      bookingDate: item.data,
      bookingTime: item.horario,
      status: item.status, // Manda o status real (PENDENTE, PAGO, CONFIRMADO)
      paymentMethod: item.metodoPagamento || "PIX",
      pricePaid: Number(item.valor),
      createdAt: item.createdAt
    }));

    return NextResponse.json(bookings);
    
  } catch (error) {
    console.error("Erro ao buscar agendamentos:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

// --- DELETAR AGENDAMENTO (DELETE) ---
export async function DELETE(request: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("admin_session"); // ⚠️ CORREÇÃO AQUI TAMBÉM

    if (!token || token.value !== "true") {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const { id } = await request.json();

    if (!id) {
      return NextResponse.json({ error: "ID não fornecido" }, { status: 400 });
    }

    // Você pode optar por DELETAR de vez ou marcar como CANCELADO
    // Se quiser apagar:
    await prisma.agendamento.delete({ where: { id } });
    
    // Se quiser só marcar como cancelado (para histórico):
    // await prisma.agendamento.update({ where: { id }, data: { status: "CANCELADO" } });

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error("Erro ao deletar:", error);
    return NextResponse.json({ error: "Erro ao deletar" }, { status: 500 });
  }
}