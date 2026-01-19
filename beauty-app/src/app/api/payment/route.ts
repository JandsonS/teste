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
      method,        
      paymentType,   
      pricePaid,     
      pricePending   
    } = body;
    
    const nomeClienteLimpo = clientName.trim();
    const BASE_URL = "https://teste-drab-rho-60.vercel.app";

    console.log(`🔒 Validando vaga para: ${nomeClienteLimpo} | Método: ${method} | Tipo: ${paymentType}`);

    const agora = new Date().getTime();

    // === FASE 1: VERIFICA SE O CLIENTE JÁ TEM AGENDAMENTO ===
    const historicoCliente = await prisma.agendamento.findMany({
      where: { cliente: nomeClienteLimpo, status: { not: 'CANCELADO' } }
    });

    for (const reserva of historicoCliente) {
      if (reserva.status === 'PENDENTE') {
        const tempoDecorrido = (agora - new Date(reserva.createdAt).getTime()) / 1000 / 60;
        
        if (tempoDecorrido >= 2) {
          await prisma.agendamento.delete({ where: { id: reserva.id } });
          continue; 
        } else {
          return NextResponse.json({ 
            error: '⏳ Você já tem um pagamento em andamento. Finalize-o ou aguarde 2 minutos.' 
          }, { status: 409 });
        }
      }

      if (reserva.status.includes('PAGO') || reserva.status.includes('SINAL') || reserva.status === 'CONFIRMADO') {
        return NextResponse.json({ 
          error: `🚫 Você já possui um agendamento ativo de "${reserva.servico}" para o dia ${reserva.data}. Não é permitido criar duplicatas.` 
        }, { status: 409 });
      }
    }

    // === FASE 2: VERIFICA SE O HORÁRIO ESTÁ LIVRE ===
    const vagaOcupada = await prisma.agendamento.findMany({
      where: { data: date, horario: time, status: { not: 'CANCELADO' } }
    });

    for (const vaga of vagaOcupada) {
      if (vaga.status.includes('PAGO') || vaga.status.includes('SINAL') || vaga.status === 'CONFIRMADO') {
        return NextResponse.json({ 
            error: '❌ Este horário já foi reservado por outro cliente. Por favor, escolha outro horário.' 
        }, { status: 409 });
      }

      if (vaga.status === 'PENDENTE') {
        const diff = (agora - new Date(vaga.createdAt).getTime()) / 1000 / 60;
        if (diff < 2) {
          return NextResponse.json({ error: '⏳ Este horário está sendo reservado agora. Tente em 2 minutos.' }, { status: 409 });
        } else {
          await prisma.agendamento.delete({ where: { id: vaga.id } });
        }
      }
    }

    // === FASE 3: PREPARAÇÃO DO NOME DO SERVIÇO ===
    let nomeServicoSalvo = title;
    if (paymentType === 'DEPOSIT') {
      nomeServicoSalvo = `${title} (Sinal Pago | Resta: R$ ${pricePending})`;
    } else {
      nomeServicoSalvo = `${title} (Integral)`;
    }

    // === FASE 4: CRIAÇÃO NO BANCO DE DADOS ===
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

    // === FASE 5: CONFIGURAÇÃO DO MERCADO PAGO ===
    
    // --- CORREÇÃO DO ERRO DE TYPESCRIPT AQUI ---
    // Adicionei ": { id: string }[]" para tipar a lista
    let excludedPaymentTypes: { id: string }[] = []; 
    let installments = 12;

    if (method === 'PIX') {
      excludedPaymentTypes = [
        { id: "credit_card" },
        { id: "debit_card" },
        { id: "ticket" },       
        { id: "atm" }           
      ];
      installments = 1;
    } else if (method === 'CARD') {
      excludedPaymentTypes = [
        { id: "bank_transfer" }, 
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