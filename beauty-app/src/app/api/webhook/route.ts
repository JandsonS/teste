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
    const url = new URL(request.url);
    const body = await request.json().catch(() => null);

    // 1. Identifica o ID do pagamento (Vem na URL ou no Corpo)
    // O Mercado Pago manda ?id=... ou ?data.id=... na URL, ou no corpo JSON
    const topic = url.searchParams.get("topic") || url.searchParams.get("type");
    const idFromUrl = url.searchParams.get("id") || url.searchParams.get("data.id");
    const idFromBody = body?.data?.id || body?.id;

    const paymentId = idFromUrl || idFromBody;

    // Ignora se não for notificação de pagamento
    if (topic !== "payment" && body?.type !== "payment" && body?.action !== "payment.created" && body?.action !== "payment.updated") {
        return NextResponse.json({ received: true }, { status: 200 });
    }

    if (!paymentId) {
        return NextResponse.json({ received: true }, { status: 200 });
    }

    console.log(`[WEBHOOK] Verificando pagamento ID: ${paymentId}`);

    // 2. Consulta o Status Real no Mercado Pago
    const payment = new Payment(client);
    const paymentInfo = await payment.get({ id: paymentId });

    // 3. Se estiver APROVADO, busca o agendamento e confirma
    if (paymentInfo.status === "approved") {
        
        // --- A MUDANÇA ESTÁ AQUI ---
        // Buscamos o agendamento que tem esse paymentId salvo
        const agendamento = await prisma.agendamento.findFirst({
            where: { paymentId: String(paymentId) }
        });

        if (agendamento) {
            // Define o método de pagamento para salvar bonito no banco
            let nomeMetodo = "OUTROS";
            const metodoMP = paymentInfo.payment_type_id;
            if (metodoMP === 'bank_transfer' || metodoMP === 'pix') nomeMetodo = "PIX";
            else if (metodoMP === 'credit_card') nomeMetodo = "CARTAO";
            else if (metodoMP === 'debit_card') nomeMetodo = "DEBITO";

            // Atualiza para CONFIRMADO
            const agendamentoAtualizado = await prisma.agendamento.update({
                where: { id: agendamento.id },
                data: { 
                    status: "CONFIRMADO", 
                    metodoPagamento: nomeMetodo,
                },
            });

            console.log(`✅ [WEBHOOK] Pagamento confirmado! Cliente: ${agendamentoAtualizado.cliente}`);

            // --- ENVIO DE NOTIFICAÇÃO (SEU CÓDIGO ORIGINAL) ---
            try {
                if (process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
                    webPush.setVapidDetails(
                        "mailto:suporte@seusite.com", // Coloque um email válido
                        process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
                        process.env.VAPID_PRIVATE_KEY
                    );

                    const subscriptions = await prisma.pushSubscription.findMany();
                    const notificationIcon = SITE_CONFIG.images.logo || "/logo.png";

                    const payload = JSON.stringify({
                        title: "💰 Novo Pagamento Pix!",
                        body: `${agendamentoAtualizado.cliente} pagou e confirmou para ${agendamentoAtualizado.horario}.`,
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
                }
            } catch (notifyError) {
                console.error("[WEBHOOK] Erro ao notificar:", notifyError);
            }
            // ---------------------------------------------------
        } else {
            console.log(`[WEBHOOK] Agendamento não encontrado para o Pagamento ID: ${paymentId}`);
        }
    }

    return NextResponse.json({ received: true }, { status: 200 });

  } catch (error) {
    console.error("[WEBHOOK] Erro Crítico:", error);
    // Retornamos 200 mesmo com erro para o Mercado Pago não ficar reenviando infinitamente
    return NextResponse.json({ received: true }, { status: 200 });
  }
}