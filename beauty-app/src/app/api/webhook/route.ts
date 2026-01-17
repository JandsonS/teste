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
    
    // Aceita o teste do painel para não dar erro
    if (body.data?.id === "123456" || body.type === "test") {
        return NextResponse.json({ received: true }, { status: 200 });
    }

    const action = body.action;
    const type = body.type;
    let id = body.data?.id || body.id;

    if (action === "payment.created" || action === "payment.updated" || type === "payment") {
      if (id) {
        const payment = new Payment(client);
        const paymentInfo = await payment.get({ id: id });

        if (paymentInfo.status === "approved") {
          const agendamentoId = paymentInfo.external_reference;
          
          if (agendamentoId) {
            // DESCUBRA O MÉTODO DE PAGAMENTO
            let statusDetalhado = "PAGO";
            const metodo = paymentInfo.payment_type_id;

            if (metodo === 'bank_transfer' || metodo === 'pix') {
                statusDetalhado = "PAGO VIA PIX";
            } else if (metodo === 'credit_card') {
                statusDetalhado = "PAGO VIA CARTÃO";
            } else if (metodo === 'debit_card') {
                statusDetalhado = "PAGO VIA DÉBITO";
            } else if (metodo === 'account_money') {
                statusDetalhado = "PAGO (SALDO MP)";
            }

            await prisma.agendamento.update({
              where: { id: agendamentoId },
              data: { 
                  status: statusDetalhado, 
                  paymentId: String(id) 
              },
            });
            console.log(`✅ ${agendamentoId} atualizado para: ${statusDetalhado}`);
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