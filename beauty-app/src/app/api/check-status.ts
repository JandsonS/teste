import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const paymentId = searchParams.get("id");

  if (!paymentId) return NextResponse.json({ error: "ID faltando" });

  // Busca o agendamento pelo ID do pagamento
  const agendamento = await prisma.agendamento.findFirst({
    where: { paymentId: String(paymentId) }
  });

  if (!agendamento) return NextResponse.json({ status: "pending" });

  // Retorna se está confirmado ou não
  return NextResponse.json({ 
    status: agendamento.status === "CONFIRMADO" ? "approved" : "pending" 
  });
}