import { NextResponse } from "next/server";
import { MercadoPagoConfig, Payment } from "mercadopago";
import { PrismaClient } from "@prisma/client";
import webPush from "web-push"; 
import { SITE_CONFIG } from "@/constants/info"; 

const globalForPrisma = global as unknown as { prisma: PrismaClient };
const prisma = globalForPrisma.prisma || new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

const client = new MercadoPagoConfig({
  accessToken: process.env.MP_ACCESS_TOKEN!,
});

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);

    // 1. Ignora requisições inválidas ou de teste
    if (!body || (body.data?.id === "123456" || body.type === "test")) {
        return NextResponse.json({ received: true }, { status: 200 });
    }

    // 2. Identifica o ID do pagamento
    const paymentId = body.data?.id || body.id;
    const type = body.type;
    const action = body.action;

    if (!paymentId || (type !== "payment" && action !== "payment.created" && action !== "payment.updated")) {
        return NextResponse.json({ received: true }, { status: 200 });
    }

    console.log(`[WEBHOOK] Processando pagamento ID: ${paymentId}`);

    // 3. Consulta status oficial
    const payment = new Payment(client);
    const paymentInfo = await payment.get({ id: paymentId });

    // 4. Se APROVADO, executa a confirmação
    if (paymentInfo.status === "approved") {
        const agendamentoId = paymentInfo.external_reference;

        if (agendamentoId) {
            // Define o método (Formato Interno)
            let nomeMetodo = "OUTROS";
            const metodoMP = paymentInfo.payment_type_id;

            if (metodoMP === 'bank_transfer' || metodoMP === 'pix') {
                nomeMetodo = "PIX";
            } else if (metodoMP === 'credit_card') {
                nomeMetodo = "CARTAO";
            } else if (metodoMP === 'debit_card') {
                nomeMetodo = "DEBITO";
            }

            // Atualiza status no Banco de Dados
            const agendamentoAtualizado = await prisma.agendamento.update({
                where: { id: agendamentoId },
                data: { 
                    status: "CONFIRMADO", 
                    metodoPagamento: nomeMetodo,
                },
            });

            console.log(`[WEBHOOK] Agendamento confirmado. Cliente: ${agendamentoAtualizado.cliente}`);

            // Envio de Notificação Push (Texto Formal)
            try {
                if (process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
                    webPush.setVapidDetails(
                        "mailto:admin@admin.com", 
                        process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
                        process.env.VAPID_PRIVATE_KEY
                    );

                    const subscriptions = await prisma.pushSubscription.findMany();
                    const notificationIcon = SITE_CONFIG.images.logo || "/logo.png";

                    // MENSAGEM FORMAL AQUI
                    const payload = JSON.stringify({
                        title: "Novo Pagamento Confirmado",
                        body: `Cliente: ${agendamentoAtualizado.cliente}. Horário: ${agendamentoAtualizado.horario}. Serviço confirmado.`,
                        url: "/admin",
                        icon: notificationIcon 
                    });

                    await Promise.all(subscriptions.map(sub => {
                        return webPush.sendNotification({
                            endpoint: sub.endpoint,
                            keys: { p256dh: sub.p256dh, auth: sub.auth }
                        }, payload).catch(err => {
                            if (err.statusCode === 410 || err.statusCode === 404) {
                                prisma.pushSubscription.delete({ where: { endpoint: sub.endpoint } }).catch(()=>{});
                            }
                        });
                    }));
                } else {
                    console.error("[WEBHOOK] Erro: Chaves VAPID não configuradas.");
                }
            } catch (notifyError) {
                console.error("[WEBHOOK] Falha ao enviar notificação:", notifyError);
            }
        }
    }

    return NextResponse.json({ received: true }, { status: 200 });

  } catch (error) {
    console.error("[WEBHOOK] Erro Interno:", error);
    return NextResponse.json({ received: true }, { status: 200 });
  }
}