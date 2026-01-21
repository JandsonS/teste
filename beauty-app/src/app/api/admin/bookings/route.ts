import { NextResponse } from "next/server";
import { cookies } from "next/headers";
// 👇 MUDANÇA AQUI: Usamos o caminho relativo para garantir que ele ache o arquivo
import { prisma } from "../../../../lib/prisma";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("admin_token");

    if (!token) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    // Busca os agendamentos no banco
    const data = await prisma.agendamento.findMany({
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Formata os dados para o painel
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
      priceTotal: item.valor,
      pricePending: 0,
      createdAt: item.createdAt
    }));

    return NextResponse.json(bookings);
    
  } catch (error) {
    console.error("Erro ao buscar agendamentos:", error);
    return NextResponse.json({ error: "Erro interno ao buscar dados" }, { status: 500 });
  }
}