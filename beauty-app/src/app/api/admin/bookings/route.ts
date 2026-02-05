import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { PrismaClient } from "@prisma/client";

// Padrão Singleton do Prisma
const globalForPrisma = global as unknown as { prisma: PrismaClient };
const prisma = globalForPrisma.prisma || new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

// --- BUSCAR AGENDAMENTOS (GET) ---
export async function GET() {
  try {
    const cookieStore = await cookies();
    
    // Verificação de segurança (Mantida do seu código original)
    const token = cookieStore.get("admin_session");

    if (!token || token.value !== "true") {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    // ============================================================
    // 🧹 1. O FAXINEIRO AUTOMÁTICO (Novidade)
    // Antes de te mostrar a lista, o sistema limpa o lixo velho.
    // ============================================================
    const tempoLimite = new Date(Date.now() - 15 * 60 * 1000); // 15 minutos atrás

    await prisma.agendamento.deleteMany({
      where: {
        status: 'PENDENTE',
        createdAt: {
          lt: tempoLimite // Deleta tudo que for PENDENTE e mais velho que 15 min
        }
      }
    });

    // ============================================================
    // 📋 2. A BUSCA INTELIGENTE (Lista Limpa)
    // ============================================================
    const data = await prisma.agendamento.findMany({
      where: {
        // AQUI ESTÁ O SEGREDO: 
        // Só trazemos do banco o que realmente importa.
        // O Admin NUNCA verá "Pendente", mesmo que tenha sido criado agora.
        status: {
            in: ['CONFIRMADO', 'PAGO', 'CANCELADO'] 
            // Adicionei CANCELADO caso vc queira ver histórico de quem cancelou manualmente
        }
      },
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
      status: item.status,
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

// --- DELETAR AGENDAMENTO (DELETE) - Mantido igual ao seu ---
export async function DELETE(request: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("admin_session");

    if (!token || token.value !== "true") {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const { id } = await request.json();

    if (!id) {
      return NextResponse.json({ error: "ID não fornecido" }, { status: 400 });
    }

    await prisma.agendamento.delete({ where: { id } });
    
    return NextResponse.json({ success: true });

  } catch (error) {
    console.error("Erro ao deletar:", error);
    return NextResponse.json({ error: "Erro ao deletar" }, { status: 500 });
  }
}