import { NextResponse } from "next/server";
import { MercadoPagoConfig, Payment } from "mercadopago";
import { prisma } from "@/lib/prisma";
import webPush from "web-push"; 
import { SITE_CONFIG } from "@/constants/info"; 

export async function POST(request: Request) {
  try {
    const url = new URL(request.url);
    const body = await request.json().catch(() => ({}));

    // 1. Extração Limpa do ID
    const idFromUrl = url.searchParams.get("data.id") || url.searchParams.get("id");
    const idFromBody = body?.data?.id || body?.id;
    let paymentId = idFromUrl || idFromBody;
    const topic = body?.type || url.searchParams.get("type") || url.searchParams.get("topic");

    // Se não for pagamento, ignora
    if (!paymentId || (topic && topic !== "payment" && topic !== "merchant_order")) {
       return NextResponse.json({ received: true });
    }

    // Garante que é string e remove espaços inúteis
    paymentId = String(paymentId).trim();

    console.log(`🔔 [WEBHOOK] Recebido ID: "${paymentId}" (Topic: ${topic})`);

    // 2. Delay Tático (3 segundos para garantir escrita no banco)
    await new Promise(resolve => setTimeout(resolve, 3000));

    // 3. Busca INVESTIGATIVA no Banco 🕵️‍♂️
    // Primeiro, tenta achar SÓ o agendamento (sem include, para evitar erro de relação)
    const agendamentoSimples = await prisma.agendamento.findFirst({
        where: { paymentId: paymentId }
    });

    // SE NÃO ACHOU: Vamos investigar por que!
    if (!agendamentoSimples) {
        console.log(`❌ [ERRO] Agendamento não encontrado para o ID: "${paymentId}"`);
        
        // DEBUG: Mostra o último agendamento criado para compararmos
        const ultimo = await prisma.agendamento.findFirst({
            orderBy: { createdAt: 'desc' }
        });
        if (ultimo) {
            console.log(`🔍 DICA: O último agendamento no banco tem paymentId: "${ultimo.paymentId}" (Status: ${ultimo.status})`);
            console.log(`   Compare: "${paymentId}" (Webhook) vs "${ultimo.paymentId}" (Banco)`);
        } else {
            console.log("🔍 O banco de dados parece estar vazio ou inacessível.");
        }

        return NextResponse.json({ received: true });
    }

    // 4. Se achou o agendamento, busca a loja (Establishment)
    const agendamentoCompleto = await prisma.agendamento.findUnique({
        where: { id: agendamentoSimples.id },
        include: { establishment: true }
    });

    const loja = agendamentoCompleto?.establishment;

    if (!loja || !loja.mercadoPagoToken) {
        console.log(`⚠️ Agendamento encontrado, mas a LOJA ou TOKEN sumiu. (Loja ID: ${agendamentoSimples.establishmentId})`);
        return NextResponse.json({ received: true });
    }

    console.log(`🏢 Loja identificada: ${loja.nome}`);

    // 5. Valida no Mercado Pago
    const client = new MercadoPagoConfig({ accessToken: loja.mercadoPagoToken! }); // ! força aceitar
    const payment = new Payment(client);
    
    let paymentInfo;
    try {
        paymentInfo = await payment.get({ id: paymentId });
    } catch (error) {
        console.log("❌ Erro ao consultar Mercado Pago (Token inválido?):", error);
        return NextResponse.json({ received: true });
    }

    // 6. Atualiza Status
    if (paymentInfo.status === "approved") {
        await prisma.agendamento.update({
            where: { id: agendamentoSimples.id },
            data: { status: "CONFIRMADO" }
        });

        console.log(`✅ SUCESSO TOTAL! Pagamento confirmado.`);

        // --- Notificação Push (Mantida) ---
        try {
            if (process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
                webPush.setVapidDetails(
                    "mailto:suporte@seusite.com",
                    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
                    process.env.VAPID_PRIVATE_KEY
                );
                const subscriptions = await prisma.pushSubscription.findMany();
                const payload = JSON.stringify({
                    title: `💰 Pix Confirmado: ${loja.nome}`,
                    body: `Novo agendamento confirmado!`,
                    icon: loja.logoUrl || SITE_CONFIG?.images?.logo
                });
                subscriptions.forEach(sub => {
                    webPush.sendNotification({
                        endpoint: sub.endpoint,
                        keys: { p256dh: sub.p256dh, auth: sub.auth }
                    }, payload).catch(() => {});
                });
            }
        } catch (e) {}
    }

    return NextResponse.json({ received: true });

  } catch (error) {
    console.error("❌ Erro Crítico no Webhook:", error);
    return NextResponse.json({ received: true }, { status: 500 });
  }
}