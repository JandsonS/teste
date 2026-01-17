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

    // DEFINA SEU SITE AQUI (Importante para o retorno funcionar)
    const BASE_URL = "https://teste-drab-rho-60.vercel.app";

    console.log(`🔒 Processando Link de Pagamento para: ${clientName}`);

    // === VALIDAÇÕES (Mantidas iguais para segurança) ===
    const agendamentosNoHorario = await prisma.agendamento.findMany({
      where: { data: date, horario: time, status: { not: 'CANCELADO' } }
    });
    
    if (agendamentosNoHorario.some(a => a.status === 'PAGO' || a.status === 'AGENDADO_LOCAL')) {
        return NextResponse.json({ error: 'Horário ocupado.' }, { status: 409 });
    }

    const agora = new Date().getTime();
    for (const item of agendamentosNoHorario) {
        if (item.status === 'PENDENTE' && (agora - new Date(item.createdAt).getTime()) / 1000 / 60 >= 10) {
            await prisma.agendamento.delete({ where: { id: item.id } });
        } else if (item.status === 'PENDENTE') {
            return NextResponse.json({ error: 'Horário em processo de pagamento.' }, { status: 409 });
        }
    }

    const reservasDoCliente = await prisma.agendamento.findMany({
        where: { cliente: clientName, data: date, status: { not: 'CANCELADO' } }
    });
    if (reservasDoCliente.some(item => item.status === 'PAGO' || item.status === 'AGENDADO_LOCAL' || (item.status === 'PENDENTE' && (agora - new Date(item.createdAt).getTime()) / 1000 / 60 < 10))) {
        return NextResponse.json({ error: 'Você já tem um agendamento hoje.' }, { status: 409 });
    }

    // === CRIAÇÃO ===
    
    // Opção 1: Pagar no Local
    if (method === 'LOCAL') {
      await prisma.agendamento.create({
        data: { cliente: clientName, servico: title, data: date, horario: time, valor: Number(price), status: "AGENDADO_LOCAL" }
      });
      return NextResponse.json({ success: true });
    }

    // Opção 2: Pagamento Online (Link)
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
        // Configuração de Retorno
        back_urls: {
          success: `${BASE_URL}/sucesso?id=${agendamento.id}`,
          failure: `${BASE_URL}/`,
          pending: `${BASE_URL}/`,
        },
        auto_return: 'approved', // Tenta voltar sozinho
        binary_mode: true,       // Força aprovação imediata (ajuda no retorno)
        external_reference: agendamento.id,
        notification_url: `${BASE_URL}/api/webhook`, // ONDE O MERCADO PAGO VAI AVISAR
      },
    });

    return NextResponse.json({ url: result.init_point });
    
  } catch (error: any) {
    console.error("❌ ERRO:", error);
    return NextResponse.json({ error: 'Erro interno.' }, { status: 500 });
  }
}