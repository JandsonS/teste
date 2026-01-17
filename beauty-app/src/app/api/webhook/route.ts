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
    const { title, price, date, time, clientName, method } = body;

    // 🚨 DEFININDO O SEU SITE REAL PARA O MERCADO PAGO ENCONTRAR
    // Se você mudar de domínio no futuro, lembre de alterar aqui!
    const BASE_URL = "https://teste-drab-rho-60.vercel.app";

    console.log(`🔒 Validando reserva para: ${clientName} em ${date} às ${time}`);

    // 1️⃣ VALIDAÇÕES DE HORÁRIO E CLIENTE (Mantidas iguais)
    const agendamentosNoHorario = await prisma.agendamento.findMany({
      where: { data: date, horario: time, status: { not: 'CANCELADO' } }
    });

    const existeBloqueioTotal = agendamentosNoHorario.some(a => 
      a.status === 'PAGO' || a.status === 'AGENDADO_LOCAL'
    );

    if (existeBloqueioTotal) {
      return NextResponse.json({ error: 'Horário já ocupado.' }, { status: 409 });
    }

    const agora = new Date().getTime();
    for (const item of agendamentosNoHorario) {
      if (item.status === 'PENDENTE') {
        const diff = (agora - new Date(item.createdAt).getTime()) / 1000 / 60;
        if (diff < 10) return NextResponse.json({ error: 'Horário em pagamento.' }, { status: 409 });
        await prisma.agendamento.delete({ where: { id: item.id } });
      }
    }

    const reservasDoCliente = await prisma.agendamento.findMany({
      where: { cliente: clientName, data: date, status: { not: 'CANCELADO' } }
    });

    const jaTemReserva = reservasDoCliente.find(item => {
      if (item.status === 'PAGO' || item.status === 'AGENDADO_LOCAL') return true;
      if (item.status === 'PENDENTE') return (agora - new Date(item.createdAt).getTime()) / 1000 / 60 < 10;
      return false;
    });

    if (jaTemReserva) {
      return NextResponse.json({ error: 'Você já tem um agendamento hoje.' }, { status: 409 });
    }

    // 2️⃣ CRIAÇÃO DO PAGAMENTO
    if (method === 'LOCAL') {
      await prisma.agendamento.create({
        data: {
          cliente: clientName, servico: title, data: date, horario: time, valor: Number(price), status: "AGENDADO_LOCAL", 
        }
      });
      return NextResponse.json({ success: true });
    }

    const agendamento = await prisma.agendamento.create({
      data: {
        cliente: clientName, servico: title, data: date, horario: time, valor: Number(price), status: "PENDENTE",
      }
    });

    // 3️⃣ AQUI ESTÁ A MÁGICA: USANDO A URL CERTA
    const preference = new Preference(client);
    const result = await preference.create({
      body: {
        items: [
          {
            id: agendamento.id,
            title: `${title} - ${date} às ${time}`,
            unit_price: Number(price),
            quantity: 1,
          },
        ],
        // O Mercado Pago agora sabe exatamente pra onde voltar
        back_urls: {
          success: `${BASE_URL}/sucesso?id=${agendamento.id}`,
          failure: `${BASE_URL}/`,
          pending: `${BASE_URL}/`,
        },
        auto_return: 'approved', // Tenta redirecionar sozinho
        external_reference: agendamento.id,
        // O Mercado Pago agora sabe onde avisar que pagou!
        notification_url: `${BASE_URL}/api/webhook`, 
      },
    });

    return NextResponse.json({ url: result.init_point });
    
  } catch (error: any) {
    console.error("❌ ERRO SERVER:", error);
    return NextResponse.json({ error: 'Erro interno.' }, { status: 500 });
  }
}