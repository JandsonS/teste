import { NextResponse } from 'next/server';
import { MercadoPagoConfig, Preference } from 'mercadopago';
import { PrismaClient } from '@prisma/client';

const globalForPrisma = global as unknown as { prisma: PrismaClient };
const prisma = globalForPrisma.prisma || new PrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

const client = new MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN! });

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { title, date, time, clientName, clientPhone, method, paymentType, pricePaid, pricePending } = body;
    const nomeClienteLimpo = clientName.trim();
    
    // ⚠️ MANTENHA O LINK DA SUA VERCEL AQUI
    const BASE_URL = "https://teste-drab-rho-60.vercel.app"; 
    
    const agora = new Date().getTime();

    // =================================================================================
    // FASE 1: LEI DO CLIENTE (EVITA DUPLICIDADE DE AGENDAMENTO)
    // =================================================================================
    const historicoCliente = await prisma.agendamento.findMany({ 
        where: { cliente: nomeClienteLimpo, status: { not: 'CANCELADO' } } 
    });

    for (const r of historicoCliente) {
       // AQUI ESTÁ A MENSAGEM DETALHADA QUE VOCÊ PEDIU
       // Verifica se ele já tem agendamento ativo (Confirmado/Pago/Pendente)
       if (r.status === 'CONFIRMADO' || r.status.includes('PAGO') || r.status === 'PENDENTE') {
           // Se for exatamente no mesmo dia, avisamos o horário específico
           if (r.data === date) {
                return NextResponse.json({ 
                    error: `🚫 Olá ${nomeClienteLimpo.split(' ')[0]}, você já possui um agendamento confirmado para hoje (${r.data}) às ${r.horario}.` 
                }, { status: 409 });
           }
           // Se você quiser impedir que ele tenha 2 agendamentos em dias diferentes, deixe assim.
           // Se quiser permitir que ele agende hoje e amanhã, adicione "&& r.data === date" no if acima.
       }
      
       // Limpeza automática de pendentes velhos
       if (r.status === 'PENDENTE') {
          const diff = (agora - new Date(r.createdAt).getTime()) / 1000 / 60;
          if (diff >= 2) {
             await prisma.agendamento.delete({ where: { id: r.id } });
          }
       }
    }

    // =================================================================================
    // FASE 2: VERIFICAÇÃO DE DISPONIBILIDADE (A CADEIRA ESTÁ LIVRE?)
    // =================================================================================
    // Buscamos QUALQUER agendamento ativo neste dia e horário.
    const vagaOcupada = await prisma.agendamento.findFirst({
        where: { 
            data: date, 
            horario: time, 
            status: { not: 'CANCELADO' } 
        }
    });

    if (vagaOcupada) {
        // Se já está pago/confirmado -> Horário Ocupado
        if (vagaOcupada.status.includes('PAGO') || vagaOcupada.status === 'CONFIRMADO') {
            return NextResponse.json({ 
                error: '❌ Este horário acabou de ser reservado por outra pessoa.' 
            }, { status: 409 });
        }

        // Se está pendente há menos de 2 minutos -> Horário "Segurado"
        if (vagaOcupada.status === 'PENDENTE') {
            const diff = (agora - new Date(vagaOcupada.createdAt).getTime()) / 1000 / 60;
            if (diff < 2) {
                return NextResponse.json({ 
                    error: '⏳ Este horário está reservado temporariamente. Tente novamente em 2 minutos.' 
                }, { status: 409 });
            } else {
                // Se passou de 2 min, derruba o antigo e deixa o novo entrar
                await prisma.agendamento.delete({ where: { id: vagaOcupada.id } });
            }
        }
    }

    // =================================================================================
    // FASE 3: CRIAR AGENDAMENTO
    // =================================================================================
    let nomeServico = paymentType === 'DEPOSIT' ? `${title} (Sinal Pago | Resta: R$ ${pricePending})` : `${title} (Integral)`;
    
    const agendamento = await prisma.agendamento.create({
      data: { 
        cliente: nomeClienteLimpo, telefone: clientPhone, servico: nomeServico, 
        data: date, horario: time, valor: Number(pricePaid), status: "PENDENTE", metodoPagamento: method 
      }
    });

    // =================================================================================
    // FASE 4: PREFERÊNCIA MERCADO PAGO
    // =================================================================================
    let excludedPaymentTypes: { id: string }[] = [];
    let installments = 12;

    if (method === 'PIX') {
        excludedPaymentTypes = [
            { id: "credit_card" }, { id: "debit_card" }, { id: "ticket" }, { id: "prepaid_card" }, { id: "atm" }
        ];
        installments = 1;
    } 
    else if (method === 'CARD') {
        excludedPaymentTypes = [
            { id: "bank_transfer" }, { id: "ticket" }, { id: "atm" }, { id: "digital_currency"}
        ];
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
    return NextResponse.json({ error: 'Erro interno.' }, { status: 500 });
  }
}