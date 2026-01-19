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
    // FASE 1: REGRA DE AGENDAMENTO ÚNICO POR CLIENTE
    // =================================================================================
    const historicoCliente = await prisma.agendamento.findMany({
      where: { cliente: nomeClienteLimpo, status: { not: 'CANCELADO' } }
    });

    for (const reserva of historicoCliente) {
      // REGRA DE OURO: SE JÁ TEM AGENDAMENTO CONFIRMADO, BLOQUEIA TUDO.
      if (reserva.status.includes('PAGO') || reserva.status.includes('SINAL') || reserva.status === 'CONFIRMADO') {
        return NextResponse.json({ 
          error: `🚫 Você já possui um agendamento confirmado para "${reserva.servico}" no dia ${reserva.data} às ${reserva.horario}. Para realizar alterações de horário ou adicionar novos serviços, é necessário entrar em contato com o estabelecimento via WhatsApp.` 
        }, { status: 409 });
      }

      // Se tem pendência (clicou em pagar antes e desistiu ou fechou a aba)
      if (reserva.status === 'PENDENTE') {
        const tempoDecorrido = (agora - new Date(reserva.createdAt).getTime()) / 1000 / 60;
        
        // Se faz mais de 2 minutos, limpamos a pendência velha (considera abandono)
        if (tempoDecorrido >= 2) {
          await prisma.agendamento.delete({ where: { id: reserva.id } });
        } 
        // Se faz menos de 2 minutos, mas é para OUTRO horário/serviço
        else if (reserva.data !== date || reserva.horario !== time) {
             return NextResponse.json({ 
                error: '⏳ Você já tem um processo de pagamento em aberto. Finalize-o antes de iniciar um novo.' 
             }, { status: 409 });
        }
      }
    }

    // =================================================================================
    // FASE 2: VERIFICAÇÃO DE DISPONIBILIDADE DA VAGA (HORÁRIO LIVRE?)
    // =================================================================================
    const vagaOcupada = await prisma.agendamento.findMany({
      where: { data: date, horario: time, status: { not: 'CANCELADO' } }
    });

    for (const vaga of vagaOcupada) {
      // 1. Bloqueio total se já estiver pago por outra pessoa
      if (vaga.status.includes('PAGO') || vaga.status.includes('SINAL') || vaga.status === 'CONFIRMADO') {
        return NextResponse.json({ 
            error: '❌ Este horário já foi reservado e pago por outro cliente.' 
        }, { status: 409 });
      }

      // 2. Tratamento de vaga PENDENTE (Em processo de pagamento)
      if (vaga.status === 'PENDENTE') {
        
        // AUTO-DESBLOQUEIO: Se for o MESMO cliente tentando de novo (retentativa)
        if (vaga.cliente.toLowerCase() === nomeClienteLimpo.toLowerCase()) {
            await prisma.agendamento.delete({ where: { id: vaga.id } });
            continue; 
        }

        // BLOQUEIO DE TERCEIROS: Se for OUTRA pessoa, aplica regra de 2 minutos
        const diff = (agora - new Date(vaga.createdAt).getTime()) / 1000 / 60; 
        
        if (diff < 2) {
          // Mensagem da regra de negócio de espera
          return NextResponse.json({ 
            error: 'Este horário está sendo reservado por favor escolha outra horário ou aguarde 2 minutos.' 
          }, { status: 409 });
        } else {
          // Timeout expirou, libera a vaga
          await prisma.agendamento.delete({ where: { id: vaga.id } });
        }
      }
    }

    // =================================================================================
    // FASE 3: CRIAÇÃO DO REGISTRO NO BANCO (AQUI FOI FEITA A ALTERAÇÃO)
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
        
        // >>> ALTERAÇÃO AQUI: Salvando se é PIX ou CARD <<<
        metodoPagamento: method 
      }
    });

    // =================================================================================
    // FASE 4: CONFIGURAÇÃO DO MERCADO PAGO
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