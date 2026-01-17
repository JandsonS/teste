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

    const BASE_URL = "https://teste-drab-rho-60.vercel.app"; // Seu site

    console.log(`🔒 Validando vaga para: ${clientName} | ${date} - ${time}`);

    // =====================================================================
    // 🛡️ BLOQUEIO TOTAL DE DUPLICIDADE
    // =====================================================================
    
    // 1. Busca qualquer agendamento naquele horário (inclusive pendentes)
    const conflitos = await prisma.agendamento.findMany({
      where: { 
        data: date, 
        horario: time, 
        status: { not: 'CANCELADO' } 
      }
    });

    const agora = new Date().getTime();

    for (const item of conflitos) {
      // Se já está PAGO de qualquer forma, BLOQUEIA.
      if (item.status.includes('PAGO') || item.status === 'AGENDADO_LOCAL') {
        return NextResponse.json({ error: '❌ Este horário já foi preenchido.' }, { status: 409 });
      }

      // Se está PENDENTE, verificamos se ainda está no "prazo de 10 minutos"
      if (item.status === 'PENDENTE') {
        const tempoDecorrido = (agora - new Date(item.createdAt).getTime()) / 1000 / 60; // em minutos

        if (tempoDecorrido < 10) {
          // Se tem alguém tentando pagar há menos de 10 min, BLOQUEIA O NOVO USUÁRIO
          return NextResponse.json({ 
            error: '⏳ Alguém está finalizando o pagamento neste horário. Tente em 10 minutos.' 
          }, { status: 409 });
        } else {
          // Se já passou 10 min, o sistema considera "Abandonado" e apaga o velho para liberar o novo
          console.log(`🗑️ Limpando agendamento expirado de ${item.cliente}`);
          await prisma.agendamento.delete({ where: { id: item.id } });
        }
      }
    }

    // 2. Verifica se o PRÓPRIO cliente já tem agendamento no dia (Regra de 1 por dia)
    const agendamentosDoCliente = await prisma.agendamento.findMany({
      where: { cliente: clientName, data: date, status: { not: 'CANCELADO' } }
    });
    
    // Verifica se ele tem algum agendamento válido hoje
    const jaTemReserva = agendamentosDoCliente.some(item => 
      item.status.includes('PAGO') || 
      item.status === 'AGENDADO_LOCAL' || 
      (item.status === 'PENDENTE' && (agora - new Date(item.createdAt).getTime()) / 1000 / 60 < 10)
    );

    if (jaTemReserva) {
        return NextResponse.json({ error: '⚠️ Você já tem um horário reservado para este dia.' }, { status: 409 });
    }

    // =====================================================================
    // ✅ CRIAÇÃO DO AGENDAMENTO
    // =====================================================================
    
    // Opção 1: Pagar no Local
    if (method === 'LOCAL') {
      await prisma.agendamento.create({
        data: { cliente: clientName, servico: title, data: date, horario: time, valor: Number(price), status: "PAGAR NO LOCAL" }
      });
      return NextResponse.json({ success: true });
    }

    // Opção 2: Pagamento Online (Mercado Pago)
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
    console.error("❌ ERRO NO PAGAMENTO:", error);
    return NextResponse.json({ error: 'Erro interno no servidor.' }, { status: 500 });
  }
}