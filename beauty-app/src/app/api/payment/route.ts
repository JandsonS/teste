import { NextResponse } from 'next/server';
import { MercadoPagoConfig, Preference } from 'mercadopago';
import { PrismaClient } from '@prisma/client';
import webPush from "web-push";
import { SITE_CONFIG } from "@/constants/info";

// Singleton do Prisma para evitar excesso de conexões
const globalForPrisma = global as unknown as { prisma: PrismaClient };
const prisma = globalForPrisma.prisma || new PrismaClient();
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

const client = new MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN! });

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { 
      title, date, time, clientName, clientPhone, 
      method, paymentType, pricePaid, pricePending, 
      isAdmin 
    } = body;

    const businessConfig = await prisma.configuracao.findFirst();
    const percentualSinal = businessConfig?.porcentagemSinal || 50;
    const valorServicoTotal = 1.0; // Valor base do seu serviço (mude conforme necessário)
    const valorFinalParaCobranca = paymentType === 'DEPOSIT' 
      ? Number((valorServicoTotal * (percentualSinal / 100)).toFixed(2))
      : valorServicoTotal;

    const valorRestaNoLocal = valorServicoTotal - valorFinalParaCobranca;
    

    // 1. Limpeza e Formatação do Nome
    const nomeClienteLimpo = clientName
        .trim()
        .toLowerCase()
        .split(' ')
        .map((palavra: string) => palavra.charAt(0).toUpperCase() + palavra.slice(1))
        .join(' ');
    
    const BASE_URL = "https://teste-drab-rho-60.vercel.app"; 
    const agora = new Date().getTime();

    // =================================================================================
    // FASE DE VALIDAÇÃO (SÓ PARA CLIENTES)
    // =================================================================================
    if (!isAdmin) {
        // --- Checagem de Duplicidade do Cliente ---
        const historicoCliente = await prisma.agendamento.findMany({ 
            where: { cliente: nomeClienteLimpo, status: { not: 'CANCELADO' } } 
        });

        for (const r of historicoCliente) {
           if (r.status === 'CONFIRMADO' || r.status.includes('PAGO') || r.status === 'PENDENTE') {
               if (r.data === date) {
                    return NextResponse.json({ 
                        error: `🚫 Olá ${nomeClienteLimpo.split(' ')[0]}, você já possui um agendamento para este dia.` 
                    }, { status: 409 });
               }
           }
          
           if (r.status === 'PENDENTE') {
              const diff = (agora - new Date(r.createdAt).getTime()) / 1000 / 60;
              if (diff >= 2) {
                  await prisma.agendamento.delete({ where: { id: r.id } }).catch(()=>{});
              }
           }
        }

        // --- Checagem de Horário Ocupado ---
        const vagaOcupada = await prisma.agendamento.findFirst({
            where: { 
                data: date, 
                horario: time, 
                status: { not: 'CANCELADO' } 
            }
        });

        if (vagaOcupada) {
            return NextResponse.json({ 
                error: '❌ Este horário já foi reservado. Por favor, escolha outro.' 
            }, { status: 409 });
        }
    }

    // =================================================================================
    // FASE DE CRIAÇÃO (ADMIN E CLIENTES)
    // =================================================================================
    let nomeServicoFinal = isAdmin ? `🚫 BLOQUEIO: ${title}` : (paymentType === 'DEPOSIT' ? `${title} (Sinal Pago | Resta: R$ ${pricePending})` : `${title} (Integral)`);
    
    const agendamento = await prisma.agendamento.create({
      data: { 
        cliente: nomeClienteLimpo, 
        telefone: clientPhone, 
        servico: nomeServicoFinal, 
        data: date, 
        horario: time, 
        valor: valorFinalParaCobranca,
        status: isAdmin ? "CONFIRMADO" : "PENDENTE", 
        metodoPagamento: method 
      }
    });

    // Se for Admin, finalizamos aqui. Não gera cobrança nem envia notificações.
    if (isAdmin) {
        return NextResponse.json({ success: true, message: "Bloqueio realizado com sucesso!" });
        if (isAdmin) return NextResponse.json({ success: true });
    }

    // =================================================================================
    // FASE DE NOTIFICAÇÃO PUSH (SÓ CLIENTES)
    // =================================================================================
    try {
      webPush.setVapidDetails(
        process.env.VAPID_SUBJECT || "mailto:admin@admin.com", 
        process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
        process.env.VAPID_PRIVATE_KEY!
      );

      const subscriptions = await prisma.pushSubscription.findMany();
      const notificationIcon = SITE_CONFIG.images.logo || "/logo.png";

      const notificationPayload = JSON.stringify({
        title: "Novo Agendamento!",
        body: `${agendamento.cliente} agendou ${title}`,
        url: "/admin",
        icon: notificationIcon 
      });

      await Promise.all(subscriptions.map(sub => {
        return webPush.sendNotification({
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh, auth: sub.auth }
        }, notificationPayload).catch(() => {
          prisma.pushSubscription.delete({ where: { endpoint: sub.endpoint } }).catch(()=>{});
        });
      }));
    } catch (e) { console.error("Push skip"); }

    // =================================================================================
    // FASE MERCADO PAGO (SÓ CLIENTES)
    // =================================================================================
    let excludedPaymentTypes: { id: string }[] = [];
    if (method === 'PIX') {
        excludedPaymentTypes = [{ id: "credit_card" }, { id: "debit_card" }, { id: "ticket" }, { id: "prepaid_card" }, { id: "atm" }];
    } else if (method === 'CARD') {
        excludedPaymentTypes = [{ id: "bank_transfer" }, { id: "ticket" }, { id: "atm" }, { id: "digital_currency"}];
    }

    const preference = new Preference(client);
    const result = await preference.create({
      body: {
        external_reference: agendamento.id,
        items: [{ id: agendamento.id, title: title, unit_price: valorFinalParaCobranca, quantity: 1 }],
        payer: { name: nomeClienteLimpo },
        payment_methods: {
          excluded_payment_types: excludedPaymentTypes,
          installments: method === 'PIX' ? 1 : 12
        },
        back_urls: { 
            success: `${BASE_URL}/sucesso?id=${agendamento.id}`, 
            failure: `${BASE_URL}/`, 
            pending: `${BASE_URL}/` 
        },
        auto_return: 'approved',
        notification_url: `${BASE_URL}/api/webhook`,
      },
    });

    return NextResponse.json({ url: result.init_point });
  } catch (error) {
    console.error(error); 
    return NextResponse.json({ error: 'Erro interno no servidor.' }, { status: 500 });
  }
}