import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const date = searchParams.get("date");

  if (!date) {
    return NextResponse.json({ error: "Data obrigatória" }, { status: 400 });
  }

  try {
    // Busca agendamentos do dia, EXCLUINDO os cancelados
    const appointments = await prisma.agendamento.findMany({
      where: {
        data: date,
        status: {
          not: "CANCELADO", // <--- O PULO DO GATO ESTÁ AQUI 🐱
        },
      },
      select: {
        horario: true,
        status: true // Pegamos o status para garantir
      },
    });

    // Filtra apenas os horários que estão realmente ocupados (não cancelados)
    // Embora o filtro do banco já resolva, garantimos aqui também
    const busySlots = appointments
      .filter(app => app.status !== "CANCELADO")
      .map((app) => app.horario);

    // Se tiver lógica de "travados" (tentando pagar), pode manter ou limpar
    // Aqui estamos retornando apenas o básico funcional
    return NextResponse.json({ 
      busy: busySlots,
      locked: [] // Se quiser implementar travamento temporário depois
    });
    
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Erro ao buscar horários" }, { status: 500 });
  }
}