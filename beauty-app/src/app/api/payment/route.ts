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
    // FASE 1: REGRA DE ANTI-DUPLICIDADE (Cliente não pode ter 2 reservas ativas)
    // =================================================================================
    const historicoCliente = await prisma.agendamento.findMany({
      where: { cliente: nomeClienteLimpo, status: { not: 'CANCELADO' } }
    });

    for (const reserva of historicoCliente) {
      // Se já pagou outro horário, bloqueia
      if (reserva.status.includes('PAGO') || reserva.status.includes('SINAL') || reserva.status === 'CONFIRMADO') {
        return NextResponse.json({ 
          error: `🚫 Você já possui um agendamento confirmado de "${reserva.servico}".` 
        }, { status: 409 });
      }

      // Se está tentando pagar outro horário agora mesmo
      if (reserva.status === 'PENDENTE') {
        const tempoDecorrido = (agora - new Date(reserva.createdAt).getTime()) / 1000 / 60;
        
        // Se a reserva velha expirou (> 2 min), deleta ela e deixa prosseguir
        if (tempoDecorrido >= 2) {
          await prisma.agendamento.delete({ where: { id: reserva.id } });
        } 
        // Se a reserva é recente (< 2 min) e é diferente da atual, bloqueia
        else if (reserva.data !== date || reserva.horario !== time) {
             return NextResponse.json({ 
                error: '⏳ Você já tem um pagamento em andamento. Finalize-o antes de iniciar outro.' 
             }, { status: 409 });
        }
      }
    }

    // =================================================================================
    // FASE 2: VERIFICAÇÃO DE DISPONIBILIDADE (REGRA DOS 2 MINUTOS)
    // =================================================================================
    
    // 1. Definição dos Grupos (Quem bloqueia quem)
    const GRUPO_BARBEARIA = ['Corte', 'Barba', 'Combo'];
    const GRUPO_ESTETICA = ['Sobrancelha'];
    
    const tituloLower = title.toLowerCase();
    let grupoAtual: string[] = [];
    
    // Identifica se o serviço atual é Estética ou Barbearia
    if (GRUPO_ESTETICA.some(s => tituloLower.includes(s.toLowerCase()))) {
        grupoAtual = GRUPO_ESTETICA;
    } else {
        grupoAtual = GRUPO_BARBEARIA;
    }

    // 2. Busca agendamentos naquele horário específico
    const agendamentosNoHorario = await prisma.agendamento.findMany({
      where: { data: date, horario: time, status: { not: 'CANCELADO' } }
    });

    // 3. Filtra apenas os que CONFLITAM (são do mesmo grupo)
    const vagaOcupada = agendamentosNoHorario.filter(vaga => {
         const vagaServico = vaga.servico.toLowerCase();
         return grupoAtual.some(g => vagaServico.includes(g.toLowerCase()));
    });

    for (const vaga of vagaOcupada) {
      // BLOQUEIO 1: Vaga já vendida/confirmada
      if (vaga.status.includes('PAGO') || vaga.status.includes('SINAL') || vaga.status === 'CONFIRMADO') {
        return NextResponse.json({ 
            error: '❌ Este horário já foi reservado. Por favor, escolha outro horário.' 
        }, { status: 409 });
      }

      // BLOQUEIO 2: Vaga em "Hold" (A Regra dos 2 Minutos)
      if (vaga.status === 'PENDENTE') {
        // Se for o PRÓPRIO cliente tentando de novo (F5 ou erro), deixa passar (deleta a antiga)
        if (vaga.cliente.toLowerCase() === nomeClienteLimpo.toLowerCase()) {
            await prisma.agendamento.delete({ where: { id: vaga.id } });
            continue; 
        }

        const diff = (agora - new Date(vaga.createdAt).getTime()) / 1000 / 60; 
        
        if (diff < 2) {
          // >>> AQUI ESTÁ A PROTEÇÃO <<<
          // Se faz menos de 2 minutos, ninguém mexe na vaga da Josefa.
          return NextResponse.json({ 
            error: '⏳ Este horário está sendo reservado por favor escolha outro horário ou aguarde 2 minutos.' 
          }, { status: 409 });
        } else {
          // Se passou de 2 minutos, a Josefa perdeu. Liberamos a vaga pro novo cliente.
          await prisma.agendamento.delete({ where: { id: vaga.id } });
        }
      }
    }

    // =================================================================================
    // FASE 3: CRIAÇÃO DO REGISTRO (Salva Telefone e cria Pendência)
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
        telefone: clientPhone, // Telefone salvo aqui
        servico: nomeServicoSalvo, 
        data: date, 
        horario: time, 
        valor: Number(pricePaid),
        status: "PENDENTE", // Começa como pendente (inicia a contagem de 2 min)
        metodoPagamento: method 
      }
    });

    // =================================================================================
    // FASE 4: INTEGRAÇÃO MERCADO PAGO
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