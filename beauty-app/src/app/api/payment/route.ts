import { NextResponse } from 'next/server';
import { MercadoPagoConfig, Preference } from 'mercadopago';
import { PrismaClient } from '@prisma/client';
import webPush from "web-push";
import { SITE_CONFIG } from "@/constants/info";

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
      isAdmin // 👈 Recebendo o sinal do Admin
    } = body;
    
    // Formatação do nome do cliente (Capitalize)
    const nomeClienteLimpo = clientName
        .trim()
        .toLowerCase()
        .split(' ')
        .map((palavra: string) => palavra.charAt(0).toUpperCase() + palavra.slice(1))
        .join(' ');
    
    const BASE_URL = "https://teste-drab-rho-60.vercel.app"; 
    const agora = new Date().getTime();

    // =================================================================================
    // FASE 1: LEI DO CLIENTE (Pula se for Admin)
    // =================================================================================
    if (!isAdmin) {
        const historicoCliente = await prisma.agendamento.findMany({ 
            where: { cliente: nomeClienteLimpo, status: { not: 'CANCELADO' } } 
        });

        for (const r of historicoCliente) {
           if (r.status === 'CONFIRMADO' || r.status.includes('PAGO') || r.status === 'PENDENTE') {
               if (r.data === date) {
                    return NextResponse.json({ 
                        error: `🚫 Olá ${nomeClienteLimpo.split(' ')[0]}, você já possui um agendamento confirmado para hoje (${r.data}) às ${r.horario}.` 
                    }, { status: 409 });
               }
           }
          
           if (r.status === 'PENDENTE') {
              const diff = (agora - new Date(r.createdAt).getTime()) / 1000 / 60;
              if (diff >= 2) {
                  await prisma.agendamento.delete({ where: { id: r.id } });
              }
           }
        }
    }

    // =================================================================================
    // FASE 2: VERIFICAÇÃO DE DISPONIBILIDADE (Pula se for Admin)
    // =================================================================================
    if (!isAdmin) {
        const vagaOcupada = await prisma.agendamento.findFirst({
            where: { 
                data: date, 
                horario: time, 
                status: { not: 'CANCELADO' } 
            }
        });

        if (vagaOcupada) {
            if (vagaOcupada.status.includes('PAGO') || vagaOcupada.status === 'CONFIRMADO') {
                return NextResponse.json({ 
                    error: '❌ Este horário acabou de ser reservado por outra pessoa.' 
                }, { status: 409 });
            }

            if (vagaOcupada.status === 'PENDENTE') {
                const diff = (agora - new Date(vagaOcupada.createdAt).getTime()) / 1000 / 60;
                if (diff < 2) {
                    return NextResponse.json({ 
                        error: '⏳ Este horário está reservado temporariamente. Tente novamente em 2 minutos.' 
                    }, { status: 409 });
                } else {
                    await prisma.agendamento.delete({ where: { id: vagaOcupada.id } });
                }
            }
        }
    }

    // =================================================================================
    // FASE 3: CRIAR AGENDAMENTO / BLOQUEIO
    // =================================================================================
    let nomeServico = paymentType === 'DEPOSIT' ? `${title} (Sinal Pago | Resta: R$ ${pricePending})` : `${title} (Integral)`;
    
    // Se for admin bloqueando, definimos um nome de serviço claro
    if (isAdmin) nomeServico = title;

    const agendamento = await prisma.agendamento.create({
      data: { 
        cliente: nomeClienteLimpo, 
        telefone: clientPhone, 
        servico: nomeServico, 
        data: date, 
        horario: time, 
        valor: Number(pricePaid), 
        status: isAdmin ? "CONFIRMADO" : "PENDENTE", 
        metodoPagamento: method 
      }
    });

    // Se for Admin, finalizamos aqui para não gerar cobrança no Mercado Pago
    if (isAdmin) {
        return NextResponse.json({ success: true, message: "Horário bloqueado!" });
    }

    // =================================================================================
    // FASE 4: NOTIFICAÇÃO PUSH (Só para clientes comuns)
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
        title: "Novo Agendamento! ✂️",
        body: `Cliente: ${agendamento.cliente} - ${agendamento.servico}`,
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
    } catch (pushError) {
      console.error("Erro Push:", pushError);
    }

    // =================================================================================
    // FASE 5: PREFERÊNCIA MERCADO PAGO
    // =================================================================================
    let excludedPaymentTypes: { id: string }[] = [];
    let installments = 12;

    if (method === 'PIX') {
        excludedPaymentTypes = [{ id: "credit_card" }, { id: "debit_card" }, { id: "ticket" }, { id: "prepaid_card" }, { id: "atm" }];
        installments = 1;
    } 
    else if (method === 'CARD') {
        excludedPaymentTypes = [{ id: "bank_transfer" }, { id: "ticket" }, { id: "atm" }, { id: "digital_currency"}];
    }

    const preference = new Preference(client);
    const result = await preference.create({
      body: {
        external_reference: agendamento.id,
        items: [{ id: agendamento.id, title: title, unit_price: Number(pricePaid), quantity: 1 }],
        payer: { name: nomeClienteLimpo },
        payment_methods: {
          excluded_payment_types: excludedPaymentTypes,
          installments: installments
        },
        back_urls: { success: `${BASE_URL}/sucesso?id=${agendamento.id}`, failure: `${BASE_URL}/`, pending: `${BASE_URL}/` },
        auto_return: 'approved',
        notification_url: `${BASE_URL}/api/webhook`,
      },
    });

    return NextResponse.json({ url: result.init_point });
  } catch (error) {
    console.error(error); 
    return NextResponse.json({ error: 'Erro interno.' }, { status: 500 });
  }
}