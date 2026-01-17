import { NextResponse } from 'next/server';
import { MercadoPagoConfig, Preference } from 'mercadopago'; // Voltamos para Preference
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

    // SEU SITE NA VERCEL
    const BASE_URL = "https://teste-drab-rho-60.vercel.app";

    console.log(`🔒 Processando Link para: ${clientName}`);

    // === 1. VALIDAÇÕES ===
    const agendamentosNoHorario = await prisma.agendamento.findMany({
      where: { data: date, horario: time, status: { not: 'CANCELADO' } }
    });
    
    if (agendamentosNoHorario.some(a => a.status === 'PAGO' || a.status === 'AGENDADO_LOCAL')) {
        return NextResponse.json({ error: 'Horário ocupado.' }, { status: 409 });
    }

    // Limpeza de pendentes antigos
    const agora = new Date().getTime();
    for (const item of agendamentosNoHorario) {
        if (item.status === 'PENDENTE' && (agora - new Date(item.createdAt).getTime()) / 1000 / 60 >= 10) {
            await prisma.agendamento.delete({ where: { id: item.id } });
        } else if (item.status === 'PENDENTE') {
            return NextResponse.json({ error: 'Horário em pagamento.' }, { status: 409 });
        }
    }

    const reservasDoCliente = await prisma.agendamento.findMany({
        where: { cliente: clientName, data: date, status: { not: 'CANCELADO' } }
    });
    if (reservasDoCliente.some(item => item.status === 'PAGO' || item.status === 'AGENDADO_LOCAL' || (item.status === 'PENDENTE' && (agora - new Date(item.createdAt).getTime()) / 1000 / 60 < 10))) {
        return NextResponse.json({ error: 'Você já tem um agendamento hoje.' }, { status: 409 });
    }

    // === 2. CRIAÇÃO ===
    
    // Opção Local
    if (method === 'LOCAL') {
      await prisma.agendamento.create({
        data: { cliente: clientName, servico: title, data: date, horario: time, valor: Number(price), status: "AGENDADO_LOCAL" }
      });
      return NextResponse.json({ success: true });
    }

    // Opção Online (Link)
    const agendamento = await prisma.agendamento.create({
      data: { cliente: clientName, servico: title, data: date, horario: time, valor: Number(price), status: "PENDENTE" }
    });

    const preference = new Preference(client);
    const result = await preference.create({
      body: {
        items: [{
            id: agendamento.id,
            title: `${title} - ${date} às ${time}`,
            unit_price: Number(price),
            quantity: 1,
        }],
        // Configurações de Retorno
        back_urls: {
          success: `${BASE_URL}/sucesso?id=${agendamento.id}`,
          failure: `${BASE_URL}/`,
          pending: `${BASE_URL}/`,
        },
        auto_return: 'approved',
        external_reference: agendamento.id, // O elo de ligação
        notification_url: `${BASE_URL}/api/webhook`, // GARANTIA EXTRA
      },
    });

    // Retorna a URL (Link) em vez de ID
    return NextResponse.json({ url: result.init_point });
    
  } catch (error: any) {
    console.error("❌ ERRO SERVER:", error);
    return NextResponse.json({ error: 'Erro interno.' }, { status: 500 });
  }
}