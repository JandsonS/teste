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

    console.log(`🔒 Validando vaga para: ${nomeClienteLimpo} | ${date} - ${time}`);

    const agora = new Date().getTime();

    // =================================================================================
    // FASE 1: VERIFICA SE O CLIENTE JÁ TEM AGENDAMENTO (DUPLICIDADE DE PESSOA)
    // =================================================================================
    const historicoCliente = await prisma.agendamento.findMany({
      where: { cliente: nomeClienteLimpo, status: { not: 'CANCELADO' } }
    });

    for (const reserva of historicoCliente) {
      // Se já pagou ou confirmou, não pode agendar outro igual
      if (reserva.status.includes('PAGO') || reserva.status.includes('SINAL') || reserva.status === 'CONFIRMADO') {
        return NextResponse.json({ 
          error: `🚫 Você já possui um agendamento ativo de "${reserva.servico}" para o dia ${reserva.data}.` 
        }, { status: 409 });
      }

      // Se tem pendência (clicou em pagar antes)
      if (reserva.status === 'PENDENTE') {
        const tempoDecorrido = (agora - new Date(reserva.createdAt).getTime()) / 1000 / 60;
        
        // Se faz MAIS de 2 minutos, limpamos a pendência velha desse cliente para ele tentar de novo
        if (tempoDecorrido >= 2) {
          await prisma.agendamento.delete({ where: { id: reserva.id } });
        } 
        // Se faz MENOS de 2 minutos, mas ele está tentando criar OUTRO agendamento (outra data/hora), bloqueamos.
        // MAS (importante): Se ele estiver tentando pagar o MESMO horário que falhou agora pouco, 
        // a lógica da FASE 2 vai tratar para liberar a retentativa.
        else if (reserva.data !== date || reserva.horario !== time) {
             return NextResponse.json({ 
                error: '⏳ Você tem um pagamento em andamento para outro horário. Finalize-o primeiro.' 
             }, { status: 409 });
        }
      }
    }

    // =================================================================================
    // FASE 2: VERIFICA SE O HORÁRIO ESTÁ LIVRE (REGRA DOS 2 MINUTOS)
    // =================================================================================
    const vagaOcupada = await prisma.agendamento.findMany({
      where: { data: date, horario: time, status: { not: 'CANCELADO' } }
    });

    for (const vaga of vagaOcupada) {
      // 1. Se já está pago/confirmado, bloqueia geral.
      if (vaga.status.includes('PAGO') || vaga.status.includes('SINAL') || vaga.status === 'CONFIRMADO') {
        return NextResponse.json({ 
            error: '❌ Este horário já foi reservado e pago por outro cliente.' 
        }, { status: 409 });
      }

      // 2. Se está PENDENTE (alguém no checkout)
      if (vaga.status === 'PENDENTE') {
        
        // >>> A CORREÇÃO ESTÁ AQUI <<<
        // Se o dono da vaga pendente for O MESMO cliente que está tentando agora,
        // significa que ele fechou o modal e abriu de novo (retentativa).
        // Nós deletamos a antiga para criar a nova imediatamente.
        if (vaga.cliente === nomeClienteLimpo) {
            await prisma.agendamento.delete({ where: { id: vaga.id } });
            continue; // Segue o fluxo para criar o novo
        }

        // Se for OUTRA PESSOA, aplicamos a sua regra de 2 minutos
        const diff = (agora - new Date(vaga.createdAt).getTime()) / 1000 / 60; 
        
        if (diff < 2) {
          // Menos de 2 min: Vaga é do outro cara.
          return NextResponse.json({ error: '⏳ Este horário está sendo finalizado por outra pessoa. Tente em 2 minutos.' }, { status: 409 });
        } else {
          // Mais de 2 min: O outro cara desistiu. Apagamos a dele e liberamos a vaga.
          await prisma.agendamento.delete({ where: { id: vaga.id } });
        }
      }
    }

    // =================================================================================
    // FASE 3: CRIAÇÃO DO REGISTRO (PENDENTE)
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
    // FASE 4: PREFERÊNCIA MERCADO PAGO
    // =================================================================================
    
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