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
    // FASE 1: ANTI-DUPLICIDADE (Regra do Cliente)
    // =================================================================================
    const historicoCliente = await prisma.agendamento.findMany({ where: { cliente: nomeClienteLimpo, status: { not: 'CANCELADO' } } });
    for (const r of historicoCliente) {
      if (r.status.includes('PAGO') || r.status === 'CONFIRMADO') return NextResponse.json({ error: `🚫 Você já possui um agendamento confirmado.` }, { status: 409 });
      
      if (r.status === 'PENDENTE') {
        const diff = (agora - new Date(r.createdAt).getTime()) / 1000 / 60;
        if (diff >= 2) await prisma.agendamento.delete({ where: { id: r.id } });
        else if (r.data !== date || r.horario !== time) return NextResponse.json({ error: '⏳ Você já tem um pagamento em andamento.' }, { status: 409 });
      }
    }

    // =================================================================================
    // FASE 2: VERIFICAÇÃO DE VAGA (Regra da Mão de Obra/Profissional)
    // =================================================================================
    
    // 1. Definição dos Grupos de Profissionais
    const GRUPO_BARBEARIA = ['corte', 'barba', 'combo'];
    const GRUPO_ESTETICA = ['sobrancelha'];
    
    // 2. Identifica qual profissional será usado para o serviço ATUAL
    let keywordsDoProfissional: string[] = [];
    const servicoSolicitado = title.toLowerCase();

    if (GRUPO_ESTETICA.some(s => servicoSolicitado.includes(s))) {
        keywordsDoProfissional = GRUPO_ESTETICA; // É a Esteticista
    } else {
        keywordsDoProfissional = GRUPO_BARBEARIA; // É o Barbeiro
    }

    // 3. Busca agendamentos naquele horário
    const vagasNoHorario = await prisma.agendamento.findMany({ 
        where: { data: date, horario: time, status: { not: 'CANCELADO' } } 
    });

    // 4. Filtra conflitos: Só trava se o agendamento existente for do MESMO PROFISSIONAL
    const vagaOcupada = vagasNoHorario.filter(vaga => {
         const servicoAgendado = vaga.servico.toLowerCase();
         // Se o serviço que já está lá for do mesmo grupo (ex: já tem um Corte e eu quero Barba), dá conflito.
         return keywordsDoProfissional.some(k => servicoAgendado.includes(k));
    });

    for (const vaga of vagaOcupada) {
      // Bloqueio Permanente
      if (vaga.status.includes('PAGO') || vaga.status === 'CONFIRMADO') {
        return NextResponse.json({ error: '❌ Este horário já foi reservado.' }, { status: 409 });
      }

      // Bloqueio Temporário (Regra dos 2 Minutos)
      if (vaga.status === 'PENDENTE') {
        if (vaga.cliente.toLowerCase() === nomeClienteLimpo.toLowerCase()) {
            await prisma.agendamento.delete({ where: { id: vaga.id } });
            continue;
        }

        const diff = (agora - new Date(vaga.createdAt).getTime()) / 1000 / 60;
        
        if (diff < 2) {
          // Mensagem formal e educada
          return NextResponse.json({ 
            error: '⏳ Este horário está sendo reservado por favor escolha outro horário ou aguarde 2 minutos.' 
          }, { status: 409 });
        } else {
          // Libera a vaga expirada
          await prisma.agendamento.delete({ where: { id: vaga.id } });
        }
      }
    }

    // =================================================================================
    // FASE 3: CRIAÇÃO DO REGISTRO
    // =================================================================================
    let nomeServico = paymentType === 'DEPOSIT' ? `${title} (Sinal Pago | Resta: R$ ${pricePending})` : `${title} (Integral)`;
    const agendamento = await prisma.agendamento.create({
      data: { 
        cliente: nomeClienteLimpo, telefone: clientPhone, servico: nomeServico, 
        data: date, horario: time, valor: Number(pricePaid), status: "PENDENTE", metodoPagamento: method 
      }
    });

    // =================================================================================
    // FASE 4: CHECKOUT MP
    // =================================================================================
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