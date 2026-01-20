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
    const BASE_URL = "https://teste-drab-rho-60.vercel.app";
    const agora = new Date().getTime();

    // =================================================================================
    // FASE 1: LEI DO CLIENTE (BLOQUEIO PESSOAL - MANTIDO)
    // =================================================================================
    const historicoCliente = await prisma.agendamento.findMany({ 
        where: { cliente: nomeClienteLimpo, status: { not: 'CANCELADO' } } 
    });

    for (const r of historicoCliente) {
      if (r.status.includes('PAGO') || r.status.includes('SINAL') || r.status === 'CONFIRMADO') {
           return NextResponse.json({ 
             error: `🚫 Olá ${nomeClienteLimpo}, você já possui um agendamento confirmado (${r.servico}). Não é possível agendar dois serviços simultâneos.` 
           }, { status: 409 });
      }
      
      if (r.status === 'PENDENTE') {
        const diff = (agora - new Date(r.createdAt).getTime()) / 1000 / 60;
        
        if (diff >= 2) {
          await prisma.agendamento.delete({ where: { id: r.id } });
        } 
        else {
          return NextResponse.json({ 
            error: '⏳ Você já tem um procedimento pendente de pagamento. Por favor, finalize-o ou aguarde 2 minutos.' 
          }, { status: 409 });
        }
      }
    }

    // =================================================================================
    // FASE 2: LEI DO SERVIÇO (ISOLAMENTO DE CONTAINER - MANTIDO)
    // =================================================================================
    const servicoSolicitado = title.toLowerCase();
    
    let containerAlvo = "";
    if (servicoSolicitado.includes('sobrancelha')) containerAlvo = 'sobrancelha';
    else if (servicoSolicitado.includes('combo')) containerAlvo = 'combo';
    else if (servicoSolicitado.includes('corte')) containerAlvo = 'corte';
    else if (servicoSolicitado.includes('barba')) containerAlvo = 'barba';
    else containerAlvo = servicoSolicitado; 

    const vagasNoHorario = await prisma.agendamento.findMany({ 
        where: { data: date, horario: time, status: { not: 'CANCELADO' } } 
    });

    const vagaOcupada = vagasNoHorario.filter(vaga => {
         const servicoNoBanco = vaga.servico.toLowerCase();
         
         if (containerAlvo === 'corte') {
            return servicoNoBanco.includes('corte'); 
         }
         if (containerAlvo === 'barba') {
            return servicoNoBanco.includes('barba');
         }
         if (containerAlvo === 'combo') {
            return servicoNoBanco.includes('combo');
         }
         
         return servicoNoBanco.includes(containerAlvo);
    });

    for (const vaga of vagaOcupada) {
      if (vaga.status.includes('PAGO') || vaga.status === 'CONFIRMADO') {
        return NextResponse.json({ error: '❌ Este horário já foi reservado para este serviço.' }, { status: 409 });
      }

      if (vaga.status === 'PENDENTE') {
        const diff = (agora - new Date(vaga.createdAt).getTime()) / 1000 / 60;
        
        if (diff < 2) {
          return NextResponse.json({ 
            error: '⏳ Este horário está sendo reservado por favor escolha outro horário ou aguarde 2 minutos.' 
          }, { status: 409 });
        } else {
          await prisma.agendamento.delete({ where: { id: vaga.id } });
        }
      }
    }

    // =================================================================================
    // FASE 3: CRIAÇÃO DO NOVO AGENDAMENTO (MANTIDO)
    // =================================================================================
    let nomeServico = paymentType === 'DEPOSIT' ? `${title} (Sinal Pago | Resta: R$ ${pricePending})` : `${title} (Integral)`;
    const agendamento = await prisma.agendamento.create({
      data: { 
        cliente: nomeClienteLimpo, telefone: clientPhone, servico: nomeServico, 
        data: date, horario: time, valor: Number(pricePaid), status: "PENDENTE", metodoPagamento: method 
      }
    });

    // =================================================================================
    // FASE 4: MERCADO PAGO COM FILTRO DE PAGAMENTO (ATUALIZADO)
    // =================================================================================
    
    // Configura o que será EXCLUÍDO (removido) da tela de pagamento
    let excludedPaymentTypes: { id: string }[] = [];
    let installments = 12; // Padrão

    if (method === 'PIX') {
        // Se escolheu PIX, remove cartões e boletos
        excludedPaymentTypes = [
            { id: "credit_card" }, 
            { id: "debit_card" }, 
            { id: "ticket" },       // Boleto
            { id: "prepaid_card" },
            { id: "atm" }
        ];
        installments = 1; // Pix não tem parcela
    } 
    else if (method === 'CARD') {
        // Se escolheu CARTÃO, remove Pix (bank_transfer) e Boleto
        excludedPaymentTypes = [
            { id: "bank_transfer" }, // Isso é o Pix
            { id: "ticket" },        // Isso é o Boleto
            { id: "atm" },
            { id: "digital_currency"}
        ];
    }

    const preference = new Preference(client);
    const result = await preference.create({
      body: {
        items: [{ id: agendamento.id, title: title, unit_price: Number(pricePaid), quantity: 1 }],
        payer: { name: nomeClienteLimpo },
        
        // AQUI APLICAMOS O FILTRO
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