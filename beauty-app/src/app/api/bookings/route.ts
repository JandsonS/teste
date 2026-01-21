import { NextResponse } from "next/server";
import { cookies } from "next/headers";
// IMPORTE SEU CLIENTE DO BANCO AQUI (Ex: import { prisma } from "@/lib/prisma")

export async function GET() {
  try {
    // 1. Verificação de Segurança (Login)
    const cookieStore = await cookies();
    const token = cookieStore.get("admin_token");

    if (!token) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    // 2. BUSQUE OS DADOS DO SEU BANCO DE DADOS AQUI
    // Exemplo se usar Prisma:
    // const bookings = await prisma.agendamento.findMany({ orderBy: { data: 'desc' } })
    
    // Como eu não tenho acesso ao seu banco, vou retornar um array vazio [] 
    // para o erro sumir, mas VOCÊ DEVE SUBSTITUIR PELO SEU BANCO REAL.
    const bookings: any[] = []; 

    return NextResponse.json(bookings);
    
  } catch (error) {
    return NextResponse.json({ error: "Erro ao buscar agendamentos" }, { status: 500 });
  }
}