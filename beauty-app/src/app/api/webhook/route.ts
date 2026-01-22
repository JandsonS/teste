import { NextResponse } from "next/server";
import { MercadoPagoConfig, Payment } from "mercadopago";
import { PrismaClient } from "@prisma/client";

// Evita múltiplas instâncias do Prisma no Hot Reload (Melhor prática Next.js)
const globalForPrisma = global as unknown as { prisma: PrismaClient };
const prisma = globalForPrisma.prisma || new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

const client = new MercadoPagoConfig({
  accessToken: process.env.MP_ACCESS_TOKEN!,
});

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);

    // 1. Ignora testes automáticos
    if (!body || (body.data?.id === "123456" || body.type === "test")) {
        return NextResponse.json({ received: true }, { status: 200 });
    }

    // 2. Identifica o ID do pagamento
    const paymentId = body.data?.id || body.id;
    const type = body.type;
    const action = body.action;

    // Se não for pagamento ou atualização de status, ignora
    if (!paymentId || (type !== "payment" && action !== "payment.created" && action !== "payment.updated")) {
        return NextResponse.json({ received: true }, { status: 200 });
    }

    // 3. Consulta a API do Mercado Pago (Segurança Total)
    const payment = new Payment(client);
    const paymentInfo = await payment.get({ id: paymentId });

    // 4. Se estiver APROVADO, atualiza o banco
    if (paymentInfo.status === "approved") {
        const agendamentoId = paymentInfo.external_reference;

        if (agendamentoId) {
            // Identifica o método para salvar no campo correto
            let nomeMetodo = "OUTROS";
            const metodoMP = paymentInfo.payment_type_id;

            if (metodoMP === 'bank_transfer' || metodoMP === 'pix') {
                nomeMetodo = "PIX";
            } else if (metodoMP === 'credit_card') {
                nomeMetodo = "CARTAO";
            } else if (metodoMP === 'debit_card') {
                nomeMetodo = "DEBITO";
            }

            // --- AQUI ESTÁ A CORREÇÃO ---
            // Salvamos status como "CONFIRMADO" para o painel reconhecer e ficar VERDE.
            // Salvamos o método (PIX, CARTAO) no campo metodoPagamento.
            await prisma.agendamento.update({
                where: { id: agendamentoId },
                data: { 
                    status: "CONFIRMADO", 
                    metodoPagamento: nomeMetodo,
                    // Se quiser salvar o valor exato pago pelo MP, descomente:
                    // valor: paymentInfo.transaction_amount 
                },
            });

            console.log(`✅ Agendamento ${agendamentoId} confirmado! Método: ${nomeMetodo}`);
        }
    }

    return NextResponse.json({ received: true }, { status: 200 });

  } catch (error) {
    console.error("❌ Erro no Webhook:", error);
    return NextResponse.json({ received: true }, { status: 200 });
  }
}