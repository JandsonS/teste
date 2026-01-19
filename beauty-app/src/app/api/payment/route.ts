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

    // FASE 1: ANTI-DUPLICIDADE
    const historicoCliente = await prisma.agendamento.findMany({ where: { cliente: nomeClienteLimpo, status: { not: 'CANCELADO' } } });
    for (const r of historicoCliente) {
      if (r.status.includes('PAGO') || r.status === 'CONFIRMADO') return NextResponse.json({ error: `🚫 Você já possui um agendamento confirmado.` }, { status: 409 });
      
      if (r.status === 'PENDENTE') {
        const diff = (agora - new Date(r.createdAt).getTime()) / 1000 / 60;
        if (diff >= 2) await prisma.agendamento.delete({ where: { id: r.id } });
        else if (r.data !== date || r.horario !== time) return NextResponse.json({ error: '⏳ Você já tem um pagamento em andamento.' }, { status: 409 });
      }
    }

    // FASE 2: VERIFICAÇÃO DE VAGA (A REGRA DE OURO)
    const GRUPO_BARBEARIA = ['Corte', 'Barba', 'Combo'];
    const GRUPO_ESTETICA = ['Sobrancelha'];
    let grupoAtual = GRUPO_BARBEARIA;
    if (GRUPO_ESTETICA.some(s => title.toLowerCase().includes(s.toLowerCase()))) grupoAtual = GRUPO_ESTETICA;

    const vagasNoHorario = await prisma.agendamento.findMany({ where: { data: date, horario: time, status: { not: 'CANCELADO' } } });
    const vagaOcupada = vagasNoHorario.filter(v => grupoAtual.some(g => v.servico.toLowerCase().includes(g.toLowerCase())));

    for (const vaga of vagaOcupada) {
      // 1. Bloqueio Permanente
      if (vaga.status.includes('PAGO') || vaga.status === 'CONFIRMADO') {
        return NextResponse.json({ error: '❌ Este horário já foi reservado.' }, { status: 409 });
      }

      // 2. Bloqueio Temporário (Regra dos 2 Minutos)
      if (vaga.status === 'PENDENTE') {
        if (vaga.cliente.toLowerCase() === nomeClienteLimpo.toLowerCase()) {
            await prisma.agendamento.delete({ where: { id: vaga.id } });
            continue;
        }

        const diff = (agora - new Date(vaga.createdAt).getTime()) / 1000 / 60;
        
        if (diff < 2) {
          // >>> MENSAGEM CORRETA AQUI <<<
          return NextResponse.json({ 
            error: '⏳ Este horário está sendo reservado por favor escolha outro horário ou aguarde 2 minutos.' 
          }, { status: 409 });
        } else {
          // Se passou 2 min, libera a vaga da Josefa para o novo cliente
          await prisma.agendamento.delete({ where: { id: vaga.id } });
        }
      }
    }

    // FASE 3: CRIAÇÃO
    let nomeServico = paymentType === 'DEPOSIT' ? `${title} (Sinal Pago | Resta: R$ ${pricePending})` : `${title} (Integral)`;
    const agendamento = await prisma.agendamento.create({
      data: { 
        cliente: nomeClienteLimpo, telefone: clientPhone, servico: nomeServico, 
        data: date, horario: time, valor: Number(pricePaid), status: "PENDENTE", metodoPagamento: method 
      }
    });

    // FASE 4: CHECKOUT MP
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