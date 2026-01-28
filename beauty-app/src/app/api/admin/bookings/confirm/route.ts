import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: Request) {
  try {
    const { id } = await req.json();

    if (!id) {
      return NextResponse.json({ message: "ID obrigatório" }, { status: 400 });
    }

    // CORREÇÃO OFICIAL: Usando 'agendamento' conforme seu schema.prisma
    const updated = await prisma.agendamento.update({
      where: { id },
      data: {
        // No seu schema, o campo de valor é 'valor'. 
        // Vamos setar para 1.0 para integralizar o teste.
        valor: 1.0, 
        status: "PAGO" // No seu schema o default é "PENDENTE" em maiúsculas
      },
    });

    return NextResponse.json({ message: "Sucesso!", updated }, { status: 200 });

  } catch (error) {
    console.error("ERRO_API:", error);
    return NextResponse.json({ message: "Erro no servidor" }, { status: 500 });
  }
}