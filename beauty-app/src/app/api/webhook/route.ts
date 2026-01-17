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
    const body = await request.json();
    console.log("🔔 Webhook recebeu:", JSON.stringify(body));

    // 1. TRUQUE PARA O PAINEL: Se for o teste do Mercado Pago (ID 123456), aceita logo!
    // Sem isso, você não consegue salvar a configuração no painel.
    if (body.data?.id === "123456" || body.id === "123456" || body.type === "test") {
        console.log("🧪 Teste do Painel MP recebido com sucesso!");
        return NextResponse.json({ received: true }, { status: 200 });
    }

    // 2. Processamento Real
    const action = body.action;
    const type = body.type;
    let id = body.data?.id || body.id;

    if (action === "payment.created" || action === "payment.updated" || type === "payment") {
      if (id) {
        // Verifica no Mercado Pago se o ID é real
        const payment = new Payment(client);
        const paymentInfo = await payment.get({ id: id });

        if (paymentInfo.status === "approved") {
          const agendamentoId = paymentInfo.external_reference;
          if (agendamentoId) {
            await prisma.agendamento.update({
              where: { id: agendamentoId },
              data: { status: "PAGO", paymentId: String(id) },
            });
            console.log(`✅ Agendamento ${agendamentoId} confirmado via Webhook!`);
          }
        }
      }
    }

    return NextResponse.json({ received: true }, { status: 200 });

  } catch (error) {
    console.error("❌ Erro no Webhook:", error);
    return NextResponse.json({ received: true }, { status: 200 });
  }
}