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
    
    const nomeClienteLimpo = clientName.trim();
    const BASE_URL = "https://teste-drab-rho-60.vercel.app";

    console.log(`🔒 Validando vaga para: ${nomeClienteLimpo}`);

    const agora = new Date().getTime();

    // === FASE 1: CLIENTE ===
    const historicoCliente = await prisma.agendamento.findMany({
      where: { cliente: nomeClienteLimpo, status: { not: 'CANCELADO' } }
    });

    for (const reserva of historicoCliente) {
      if (reserva.status === 'PENDENTE') {
        const tempoDecorrido = (agora - new Date(reserva.createdAt).getTime()) / 1000 / 60;
        
        // ⏳ MUDANÇA: AGORA É 2 MINUTOS
        if (tempoDecorrido >= 2) {
          await prisma.agendamento.delete({ where: { id: reserva.id } });
          continue; 
        } else {
          return NextResponse.json({ 
            error: '⏳ Você já tem um pagamento em andamento. Finalize-o ou aguarde 2 minutos.' 
          }, { status: 409 });
        }
      }

      if (reserva.status.includes('PAGO') || reserva.status === 'PAGAR NO LOCAL') {
        return NextResponse.json({ 
          error: `🚫 Você já possui um agendamento ativo de "${reserva.servico}" para o dia ${reserva.data} às ${reserva.horario}. Não é permitido criar duplicatas.` 
        }, { status: 409 });
      }
    }

    // === FASE 2: HORÁRIO ===
    const vagaOcupada = await prisma.agendamento.findMany({
      where: { data: date, horario: time, status: { not: 'CANCELADO' } }
    });

    for (const vaga of vagaOcupada) {
      if (vaga.status.includes('PAGO') || vaga.status === 'PAGAR NO LOCAL') {
        return NextResponse.json({ 
            error: '❌ Este horário já foi reservado por outro cliente. Por favor, escolha outro horário disponível.' 
        }, { status: 409 });
      }

      if (vaga.status === 'PENDENTE') {
        const diff = (agora - new Date(vaga.createdAt).getTime()) / 1000 / 60;
        // ⏳ MUDANÇA: AGORA É 2 MINUTOS
        if (diff < 2) {
          return NextResponse.json({ error: '⏳ Este horário está sendo reservado agora. Tente em 2 minutos.' }, { status: 409 });
        } else {
          await prisma.agendamento.delete({ where: { id: vaga.id } });
        }
      }
    }

    // === SUCESSO ===
    if (method === 'LOCAL') {
      await prisma.agendamento.create({
        data: { cliente: nomeClienteLimpo, servico: title, data: date, horario: time, valor: Number(price), status: "PAGAR NO LOCAL" }
      });
      return NextResponse.json({ success: true });
    }

    const agendamento = await prisma.agendamento.create({
      data: { cliente: nomeClienteLimpo, servico: title, data: date, horario: time, valor: Number(price), status: "PENDENTE" }
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
    console.error("❌ ERRO:", error);
    return NextResponse.json({ error: 'Erro interno.' }, { status: 500 });
  }
}