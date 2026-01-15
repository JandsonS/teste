import { NextResponse } from "next/server";
import { MercadoPagoConfig, Payment } from "mercadopago";
import { PrismaClient } from "@prisma/client";

const globalForPrisma = global as unknown as { prisma: PrismaClient };
const prisma = globalForPrisma.prisma || new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

const client = new MercadoPagoConfig({
  accessToken: process.env.MP_ACCESS_TOKEN!,
});

export async function POST(request: Request) {
  try {
    // 1. O Mercado Pago envia os dados na URL ou no Corpo
    const url = new URL(request.url);
    const topic = url.searchParams.get("topic") || url.searchParams.get("type");
    const id = url.searchParams.get("id") || url.searchParams.get("data.id");

    // Nós só nos importamos se for notificação de PAGAMENTO
    if (topic === "payment" && id) {
      
      // 2. SEGURANÇA MÁXIMA: Perguntamos ao Mercado Pago se esse ID é real
      // (Isso evita que hackers tentem forjar um pagamento)
      const payment = new Payment(client);
      const paymentInfo = await payment.get({ id: id });

      // 3. Se o status for APROVADO, atualizamos no banco
      if (paymentInfo.status === "approved") {
        
        // O "external_reference" é o ID do agendamento que enviamos antes
        const agendamentoId = paymentInfo.external_reference;

        if (agendamentoId) {
          await prisma.agendamento.update({
            where: { id: agendamentoId },
            data: { 
              status: "PAGO",
              paymentId: id // Guardamos o ID do comprovante do MP
            },
          });
          console.log(`✅ Agendamento ${agendamentoId} atualizado para PAGO!`);
        }
      }
    }

    return NextResponse.json({ received: true }, { status: 200 });

  } catch (error) {
    console.error("Erro no Webhook:", error);
    // Retornamos 200 mesmo com erro para o Mercado Pago não ficar tentando reenviar infinitamente
    return NextResponse.json({ received: true }, { status: 200 });
  }
}