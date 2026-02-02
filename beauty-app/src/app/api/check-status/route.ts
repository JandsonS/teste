import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const paymentId = searchParams.get("id");

    if (!paymentId) return NextResponse.json({ status: "error", message: "ID faltando" });

    // Busca o agendamento (tenta como string ou número para garantir)
    const agendamento = await prisma.agendamento.findFirst({
      where: { 
        OR: [
          { paymentId: String(paymentId) },
          // Se o seu banco salva como Int, descomente a linha abaixo:
          // { paymentId: Number(paymentId) } 
        ]
      }
    });

    if (!agendamento) {
        // Se não achou, ainda está pendente ou ID errado
        return NextResponse.json({ status: "pending" });
    }

    // Se estiver CONFIRMADO ou PAGO, avisa o frontend
    const aprovado = agendamento.status === "CONFIRMADO" || agendamento.status === "PAGO";
    
    return NextResponse.json({ 
      status: aprovado ? "approved" : "pending" 
    });

  } catch (error) {
    return NextResponse.json({ status: "error" });
  }
}