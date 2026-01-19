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
      title, 
      date, 
      time, 
      clientName, 
      clientPhone, 
      method,        // 'PIX' ou 'CARD'
      paymentType,   // 'FULL' ou 'DEPOSIT'
      pricePaid,     // Valor a pagar agora
      pricePending   // Valor restante
    } = body;
    
    const nomeClienteLimpo = clientName.trim();
    const BASE_URL = "https://teste-drab-rho-60.vercel.app";

    console.log(`🔒 Processando: ${nomeClienteLimpo} | Método: ${method}`);

    const agora = new Date().getTime();

    // =================================================================================
    // FASE 1: LIMPEZA E VERIFICAÇÃO DE DUPLICIDADE (PESSOA)
    // =================================================================================
    const historicoCliente = await prisma.agendamento.findMany({
      where: { cliente: nomeClienteLimpo, status: { not: 'CANCELADO' } }
    });

    for (const reserva of historicoCliente) {
      // Regra: Se já pagou/confirmou, não pode agendar outro igual
      if (reserva.status.includes('PAGO') || reserva.status.includes('SINAL') || reserva.status === 'CONFIRMADO') {
        return NextResponse.json({ 
          error: `🚫 Você já possui um agendamento ativo de "${reserva.servico}" para o dia ${reserva.data}.` 
        }, { status: 409 });
      }

      // Regra: Se tem pendência (clicou em pagar antes e desistiu ou fechou a aba)
      if (reserva.status === 'PENDENTE') {
        const tempoDecorrido = (agora - new Date(reserva.createdAt).getTime()) / 1000 / 60;
        
        // Se faz mais de 2 minutos, limpamos a pendência velha
        if (tempoDecorrido >= 2) {
          await prisma.agendamento.delete({ where: { id: reserva.id } });
        } 
        // Se faz menos de 2 minutos, mas é para OUTRO horário, bloqueia (1 agendamento por vez)
        else if (reserva.data !== date || reserva.horario !== time) {
             return NextResponse.json({ 
                error: '⏳ Você tem um pagamento em andamento. Finalize-o antes de iniciar outro.' 
             }, { status: 409 });
        }
        // Se for o MESMO horário, a Fase 2 vai resolver (retentativa)
      }
    }

    // =================================================================================
    // FASE 2: VERIFICAÇÃO DE DISPONIBILIDADE DA VAGA (HORÁRIO)
    // =================================================================================
    const vagaOcupada = await prisma.agendamento.findMany({
      where: { data: date, horario: time, status: { not: 'CANCELADO' } }
    });

    for (const vaga of vagaOcupada) {
      // 1. Bloqueio total se já estiver pago
      if (vaga.status.includes('PAGO') || vaga.status.includes('SINAL') || vaga.status === 'CONFIRMADO') {
        return NextResponse.json({ 
            error: '❌ Este horário acabou de ser reservado por outro cliente.' 
        }, { status: 409 });
      }

      // 2. Tratamento de vaga PENDENTE (no checkout)
      if (vaga.status === 'PENDENTE') {
        
        // AUTO-DESBLOQUEIO: Se for o MESMO cliente tentando de novo, deleta a anterior e deixa passar
        if (vaga.cliente === nomeClienteLimpo) {
            await prisma.agendamento.delete({ where: { id: vaga.id } });
            continue; 
        }

        // BLOQUEIO DE TERCEIROS: Se for OUTRA pessoa, aplica regra de 2 minutos
        const diff = (agora - new Date(vaga.createdAt).getTime()) / 1000 / 60; 
        
        if (diff < 2) {
          return NextResponse.json({ error: '⏳ Este horário está sendo finalizado por outra pessoa. Tente em 2 minutos.' }, { status: 409 });
        } else {
          // Timeout expirou, libera a vaga
          await prisma.agendamento.delete({ where: { id: vaga.id } });
        }
      }
    }

    // =================================================================================
    // FASE 3: CRIAÇÃO DO REGISTRO NO BANCO
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
        status: "PENDENTE" 
      }
    });

    // =================================================================================
    // FASE 4: CONFIGURAÇÃO DO MERCADO PAGO (FILTRO PIX vs CARTÃO)
    // =================================================================================
    
    // IMPORTANTE: A tipagem aqui corrige o erro de "implicit any"
    let excludedPaymentTypes: { id: string }[] = []; 
    let installments = 12;

    if (method === 'PIX') {
      // Se escolheu PIX, removemos TUDO que não é Pix para cair direto no QR Code
      excludedPaymentTypes = [
        { id: "credit_card" },
        { id: "debit_card" },
        { id: "ticket" },       // Boleto
        { id: "atm" },          // Lotérica
        { id: "prepaid_card" }  // Cartão pré-pago
      ];
      installments = 1;
    } else if (method === 'CARD') {
      // Se escolheu CARTÃO, removemos Pix e Boleto para cair no formulário de cartão
      excludedPaymentTypes = [
        { id: "bank_transfer" }, // Pix
        { id: "ticket" },
        { id: "atm" }
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
        payer: {
          name: nomeClienteLimpo,
          // phone: { number: clientPhone } // Opcional: ajuda o MP a preencher dados
        },
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
        binary_mode: true, // Isso ajuda a pular telas intermediárias
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