import { NextResponse } from "next/server";
import { cookies } from "next/headers";
// Importe usando o caminho relativo manual que funcionou pra você
import { prisma } from "../../../../lib/prisma";

// --- BUSCAR AGENDAMENTOS (GET) ---
export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("admin_token");

    if (!token) {
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
      serviceTitle: item.servico,
      bookingDate: item.data,
      bookingTime: item.horario,
      status: item.status === 'CONFIRMADO' || item.status === 'PAGO' ? 'paid' : 'pending',
      paymentMethod: item.metodoPagamento || "PIX",
      pricePaid: item.valor,
      pricePending: 0,
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
    // 1. Segurança
    const cookieStore = await cookies();
    const token = cookieStore.get("admin_token");

    if (!token) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    // 2. Pegar o ID que veio no corpo do pedido
    const { id } = await request.json();

    if (!id) {
      return NextResponse.json({ error: "ID não fornecido" }, { status: 400 });
    }

    // 3. Deletar do banco
    await prisma.agendamento.delete({
      where: { id }
    });

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error("Erro ao deletar:", error);
    return NextResponse.json({ error: "Erro ao deletar" }, { status: 500 });
  }
}