import { NextResponse } from 'next/server';
import { MercadoPagoConfig, Preference } from 'mercadopago';
import { PrismaClient } from '@prisma/client';

const globalForPrisma = global as unknown as { prisma: PrismaClient };
const prisma = globalForPrisma.prisma || new PrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

const client = new MercadoPagoConfig({ 
  accessToken: process.env.MP_ACCESS_TOKEN! 
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    const { 
      title, date, time, clientName, clientPhone, 
      method, paymentType, pricePaid, pricePending 
    } = body;
    
    const nomeClienteLimpo = clientName.trim();
    const BASE_URL = "https://teste-drab-rho-60.vercel.app";
    const agora = new Date().getTime();

    console.log(`🔒 Processando: ${nomeClienteLimpo} | ${date} - ${time}`);

    // =================================================================================
    // FASE 1: LIMPEZA DE PENDÊNCIAS DO PRÓPRIO CLIENTE
    // =================================================================================
    // Se VOCÊ mesmo desistiu de um pagamento anterior, o sistema limpa pra você tentar de novo.
    const historicoCliente = await prisma.agendamento.findMany({
      where: { cliente: nomeClienteLimpo, status: { not: 'CANCELADO' } }
    });

    for (const reserva of historicoCliente) {
      if (reserva.status.includes('PAGO') || reserva.status.includes('SINAL') || reserva.status === 'CONFIRMADO') {
        return NextResponse.json({ 
          error: `🚫 Você já possui um agendamento confirmado para o dia ${reserva.data} às ${reserva.horario}. Para alterações, entre em contato via WhatsApp.` 
        }, { status: 409 });
      }

      if (reserva.status === 'PENDENTE') {
        const tempoDecorrido = (agora - new Date(reserva.createdAt).getTime()) / 1000 / 60;
        
        // Se faz mais de 2 min, limpa a pendência antiga
        if (tempoDecorrido >= 2) {
          await prisma.agendamento.delete({ where: { id: reserva.id } });
        } 
        // Se faz menos de 2 min e é outro horário, bloqueia
        else if (reserva.data !== date || reserva.horario !== time) {
             return NextResponse.json({ 
                error: '⏳ Você já tem um pagamento em andamento. Finalize-o antes de iniciar outro.' 
             }, { status: 409 });
        }
      }
    }

    // =================================================================================
    // FASE 2: VERIFICAÇÃO DE DISPONIBILIDADE DA VAGA (REGRA DOS 2 MINUTOS)
    // =================================================================================
    const vagaOcupada = await prisma.agendamento.findMany({
      where: { data: date, horario: time, status: { not: 'CANCELADO' } }
    });

    for (const vaga of vagaOcupada) {
      // 1. SE JÁ ESTÁ PAGO -> BLOQUEIO PERMANENTE
      if (vaga.status.includes('PAGO') || vaga.status.includes('SINAL') || vaga.status === 'CONFIRMADO') {
        return NextResponse.json({ 
            // MENSAGEM PARA QUANDO O CLIENTE A JÁ FINALIZOU
            error: '❌ Este horário já foi reservado. Por favor, escolha outro horário.' 
        }, { status: 409 });
      }

      // 2. SE ESTÁ PENDENTE (Cliente A clicou mas não pagou ainda)
      if (vaga.status === 'PENDENTE') {
        
        // Se for o MESMO cliente tentando de novo, deixa passar (limpa o anterior)
        if (vaga.cliente.toLowerCase() === nomeClienteLimpo.toLowerCase()) {
            await prisma.agendamento.delete({ where: { id: vaga.id } });
            continue; 
        }

        // Se for OUTRO cliente, verifica o tempo
        const diff = (agora - new Date(vaga.createdAt).getTime()) / 1000 / 60; 
        
        if (diff < 2) {
          // MENSAGEM PARA QUANDO O CLIENTE A AINDA ESTÁ PAGANDO (BLOQUEIO TEMPORÁRIO)
          return NextResponse.json({ 
            error: '⏳ Este horário está em processo de pagamento por outro cliente. Tente novamente em 2 minutos caso ele desista.' 
          }, { status: 409 });
        } else {
          // Passou de 2 minutos? O Cliente A desistiu. Liberamos a vaga para você (Cliente B).
          await prisma.agendamento.delete({ where: { id: vaga.id } });
        }
      }
    }

    // =================================================================================
    // FASE 3: CRIAÇÃO DO REGISTRO
    // =================================================================================
    let nomeServicoSalvo = title;
    if (paymentType === 'DEPOSIT') {
      nomeServicoSalvo = `${title} (Sinal Pago | Resta: R$ ${pricePending})`;
    } else {
      nomeServicoSalvo = `${title} (Integral)`;
    }

    const agendamento = await prisma.agendamento.create({
      data: { 
        cliente: nomeClienteLimpo, 
        servico: nomeServicoSalvo, 
        data: date, 
        horario: time, 
        valor: Number(pricePaid),
        status: "PENDENTE",
        metodoPagamento: method 
      }
    });

    // =================================================================================
    // FASE 4: PREFERÊNCIA MERCADO PAGO
    // =================================================================================
    let excludedPaymentTypes: { id: string }[] = []; 
    let installments = 12;

    if (method === 'PIX') {
      excludedPaymentTypes = [
        { id: "credit_card" }, { id: "debit_card" }, { id: "ticket" }, { id: "atm" }, { id: "prepaid_card" }  
      ];
      installments = 1;
    } else if (method === 'CARD') {
      excludedPaymentTypes = [
        { id: "bank_transfer" }, { id: "ticket" }, { id: "atm" }
      ];
    }

    const preference = new Preference(client);
    const result = await preference.create({
      body: {
        items: [{
            id: agendamento.id,
            title: paymentType === 'DEPOSIT' ? `Reserva: ${title}` : title,
            unit_price: Number(pricePaid),
            quantity: 1,
        }],
        payer: { name: nomeClienteLimpo },
        payment_methods: {
          excluded_payment_types: excludedPaymentTypes,
          installments: installments
        },
        back_urls: {
          success: `${BASE_URL}/sucesso?id=${agendamento.id}`,
          failure: `${BASE_URL}/`,
          pending: `${BASE_URL}/`,
        },
        auto_return: 'approved',
        binary_mode: true, 
        external_reference: agendamento.id,
        notification_url: `${BASE_URL}/api/webhook`,
      },
    });

    return NextResponse.json({ url: result.init_point });
    
  } catch (error: any) {
    console.error("❌ ERRO NO BACKEND:", error);
    return NextResponse.json({ error: 'Erro interno ao processar pagamento.' }, { status: 500 });
  }
}