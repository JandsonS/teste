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
    // FASE 1: LEI DO CLIENTE (BLOQUEIO PESSOAL)
    // =================================================================================
    // Regra: "Se o Ricardo já tem um serviço, ele não pode escolher outro."
    // Verificamos TODOS os agendamentos desse cliente, independente do serviço.
    const historicoCliente = await prisma.agendamento.findMany({ 
        where: { cliente: nomeClienteLimpo, status: { not: 'CANCELADO' } } 
    });

    for (const r of historicoCliente) {
      // 1. Se já está garantido (Pago/Confirmado), ele não pode marcar mais nada.
      if (r.status.includes('PAGO') || r.status.includes('SINAL') || r.status === 'CONFIRMADO') {
           // Bloqueio Total: Cliente já tem compromisso.
           return NextResponse.json({ 
             error: `🚫 Olá ${nomeClienteLimpo}, você já possui um agendamento confirmado (${r.servico}). Não é possível agendar dois serviços simultâneos.` 
           }, { status: 409 });
      }
      
      // 2. Se está tentando pagar (Pendente), verificamos se ainda é válido (2 min).
      if (r.status === 'PENDENTE') {
        const diff = (agora - new Date(r.createdAt).getTime()) / 1000 / 60;
        
        if (diff >= 2) {
          // Se passou de 2 min, deletamos o antigo para ele poder tentar de novo.
          await prisma.agendamento.delete({ where: { id: r.id } });
        } 
        else {
          // Se está dentro dos 2 min, BLOQUEIA. Ele está "em atendimento" no caixa.
          return NextResponse.json({ 
            error: '⏳ Você já tem um procedimento pendente de pagamento. Por favor, finalize-o ou aguarde 2 minutos.' 
          }, { status: 409 });
        }
      }
    }

    // =================================================================================
    // FASE 2: LEI DO SERVIÇO (ISOLAMENTO DE CONTAINER)
    // =================================================================================
    // Regra: "Corte bloqueia Corte. Barba bloqueia Barba. Um não mexe no outro."
    
    const servicoSolicitado = title.toLowerCase();
    
    // Identifica qual é a "Palavra-Chave" estrita deste serviço
    let containerAlvo = "";
    if (servicoSolicitado.includes('sobrancelha')) containerAlvo = 'sobrancelha';
    else if (servicoSolicitado.includes('combo')) containerAlvo = 'combo';
    else if (servicoSolicitado.includes('corte')) containerAlvo = 'corte';
    else if (servicoSolicitado.includes('barba')) containerAlvo = 'barba';
    else containerAlvo = servicoSolicitado; // Outros

    // Busca agendamentos APENAS neste horário específico
    const vagasNoHorario = await prisma.agendamento.findMany({ 
        where: { data: date, horario: time, status: { not: 'CANCELADO' } } 
    });

    // Filtra: Só consideramos conflito se o agendamento lá no banco for do MESMO TIPO.
    // Ex: Se eu quero "Corte", eu ignoro se tiver "Barba" lá.
    const vagaOcupada = vagasNoHorario.filter(vaga => {
         const servicoNoBanco = vaga.servico.toLowerCase();
         
         // Aqui está o segredo: Strict Match (Correspondência Exata)
         // Se eu quero Corte, só me importo se tiver Corte ou Combo (porque Combo tem Corte).
         // Mas se você quiser independência TOTAL, usamos apenas o nome:
         
         if (containerAlvo === 'corte') {
            // Corte só bate com Corte. (Se quiser que Combo bloqueie Corte, adicione aqui)
            return servicoNoBanco.includes('corte'); 
         }
         if (containerAlvo === 'barba') {
            return servicoNoBanco.includes('barba');
         }
         if (containerAlvo === 'combo') {
            return servicoNoBanco.includes('combo');
         }
         
         // Para sobrancelha e outros
         return servicoNoBanco.includes(containerAlvo);
    });

    for (const vaga of vagaOcupada) {
      // Bloqueio Permanente
      if (vaga.status.includes('PAGO') || vaga.status === 'CONFIRMADO') {
        return NextResponse.json({ error: '❌ Este horário já foi reservado para este serviço.' }, { status: 409 });
      }

      // Bloqueio Temporário (Regra dos 2 Minutos)
      // Aqui protegemos a vaga de OUTRO cliente (ex: Carlos tentando pegar a vaga do Pedro)
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
    // FASE 3: CRIAÇÃO DO NOVO AGENDAMENTO
    // =================================================================================
    let nomeServico = paymentType === 'DEPOSIT' ? `${title} (Sinal Pago | Resta: R$ ${pricePending})` : `${title} (Integral)`;
    const agendamento = await prisma.agendamento.create({
      data: { 
        cliente: nomeClienteLimpo, telefone: clientPhone, servico: nomeServico, 
        data: date, horario: time, valor: Number(pricePaid), status: "PENDENTE", metodoPagamento: method 
      }
    });

    // FASE 4: MERCADO PAGO
    const preference = new Preference(client);
    const result = await preference.create({
      body: {
        items: [{ id: agendamento.id, title: title, unit_price: Number(pricePaid), quantity: 1 }],
        payer: { name: nomeClienteLimpo },
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