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
    const body = await request.json().catch(() => null);

    // 1. Validação simples para ignorar testes automáticos do MP
    if (!body || (body.data?.id === "123456" || body.type === "test")) {
        return NextResponse.json({ received: true }, { status: 200 });
    }

    // 2. Identifica o ID do pagamento
    const paymentId = body.data?.id || body.id;
    const action = body.action;
    const type = body.type;

    // Só processamos notificações de pagamento reais
    if (!paymentId || (type !== "payment" && action !== "payment.created" && action !== "payment.updated")) {
        return NextResponse.json({ received: true }, { status: 200 });
    }

    // 3. Consulta a API do Mercado Pago para ver o status real
    const payment = new Payment(client);
    const paymentInfo = await payment.get({ id: paymentId });

    // 4. Se estiver APROVADO, atualiza o banco
    if (paymentInfo.status === "approved") {
        // Pega o ID que enviamos no 'external_reference' no arquivo de pagamento
        const agendamentoId = paymentInfo.external_reference;

        if (agendamentoId) {
            // Define o texto bonito para o Painel Administrativo
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

            // Atualiza no Prisma
            await prisma.agendamento.update({
                where: { id: agendamentoId },
                data: { 
                    status: statusDetalhado,
                    // Se você tiver a coluna paymentId no seu schema.prisma, pode descomentar a linha abaixo:
                    // paymentId: String(paymentId) 
                },
            });

            console.log(`✅ Agendamento ${agendamentoId} confirmado! Status: ${statusDetalhado}`);
        } else {
            console.warn("⚠️ Pagamento aprovado sem ID do agendamento (external_reference vazio).");
        }
    }

    return NextResponse.json({ received: true }, { status: 200 });

  } catch (error) {
    console.error("❌ Erro no Webhook:", error);
    // Retorna 200 para evitar loop de erro com o Mercado Pago
    return NextResponse.json({ received: true }, { status: 200 });
  }
}