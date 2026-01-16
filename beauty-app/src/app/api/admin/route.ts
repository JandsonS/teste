import { NextResponse } from 'next/server';
import { MercadoPagoConfig, Preference } from 'mercadopago';
import { SITE_CONFIG } from '@/constants/info';
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

    console.log(`🔒 Validando reserva para: ${clientName} em ${date} às ${time}`);

    // =========================================================================
    // 1️⃣ REGRA DO HORÁRIO (Ninguém pode pegar um horário ocupado)
    // =========================================================================
    const agendamentoNoHorario = await prisma.agendamento.findFirst({
      where: {
        data: date,
        horario: time,
        status: { not: 'CANCELADO' } // Ignoramos os cancelados, eles não ocupam vaga
      }
    });

    if (agendamentoNoHorario) {
      // Se já está PAGO ou foi no LOCAL, acabou. O horário é dele.
      if (agendamentoNoHorario.status === 'PAGO' || agendamentoNoHorario.status === 'AGENDADO_LOCAL') {
        return NextResponse.json(
          { error: 'Este horário já está preenchido e confirmado.' }, 
          { status: 409 }
        );
      }
      
      // Se está PENDENTE, vamos ver se já passou os 10 MINUTOS de tolerância
      if (agendamentoNoHorario.status === 'PENDENTE') {
        const horaCriacao = new Date(agendamentoNoHorario.createdAt).getTime();
        const agora = new Date().getTime();
        const minutosPassados = (agora - horaCriacao) / 1000 / 60; // Converte ms para minutos

        if (minutosPassados < 10) {
          // Menos de 10 min? Ainda está segurando a vaga.
          return NextResponse.json(
            { error: 'Este horário está reservado temporariamente. Tente novamente em 10 minutos.' }, 
            { status: 409 }
          );
        } else {
          // Passou de 10 min e não pagou? TCHAU! 🚮
          // Deletamos o antigo para liberar a vaga para você agora.
          console.log(`⏳ Agendamento expirado (${minutosPassados.toFixed(0)} min). Liberando vaga...`);
          await prisma.agendamento.delete({ where: { id: agendamentoNoHorario.id } });
        }
      }
    }

    // =========================================================================
    // 2️⃣ REGRA DO CLIENTE (O mesmo cara não pode ter 2 horários ativos no dia)
    // =========================================================================
    const reservasDoCliente = await prisma.agendamento.findMany({
      where: {
        cliente: clientName,
        data: date, // Verificamos duplicidade APENAS no mesmo dia
        status: { not: 'CANCELADO' }
      }
    });

    // Vamos verificar se ele tem alguma reserva que esteja VALENDO (Paga ou Pendente < 10min)
    const reservaAtiva = reservasDoCliente.find(item => {
      if (item.status === 'PAGO' || item.status === 'AGENDADO_LOCAL') return true;
      
      if (item.status === 'PENDENTE') {
        const diff = (new Date().getTime() - new Date(item.createdAt).getTime()) / 1000 / 60;
        return diff < 10; // Se for pendente recente, conta como ativa!
      }
      return false;
    });

    if (reservaAtiva) {
      return NextResponse.json(
        { error: `Você já tem um horário reservado (${reservaAtiva.horario}). Não é possível agendar dois.` }, 
        { status: 409 }
      );
    }

    // =========================================================================
    // 3️⃣ CRIAÇÃO DO AGENDAMENTO (Se passou por tudo, pode criar!)
    // =========================================================================
    
    // Opção 1: Pagamento no Local
    if (method === 'LOCAL') {
      await prisma.agendamento.create({
        data: {
          cliente: clientName,
          servico: title,
          data: date,
          horario: time,
          valor: Number(price),
          status: "AGENDADO_LOCAL", 
        }
      });
      return NextResponse.json({ success: true });
    }

    // Opção 2: Pagamento Online (Mercado Pago)
    const agendamento = await prisma.agendamento.create({
      data: {
        cliente: clientName,
        servico: title,
        data: date,
        horario: time,
        valor: Number(price),
        status: "PENDENTE", // Nasce pendente e tem 10 min de vida útil
      }
    });

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
        back_urls: {
          success: `${SITE_CONFIG.url}/sucesso?id=${agendamento.id}`,
          failure: `${SITE_CONFIG.url}/`,
          pending: `${SITE_CONFIG.url}/`,
        },
        auto_return: 'approved',
        external_reference: agendamento.id,
        notification_url: `${SITE_CONFIG.url}/api/webhook`,
      },
    });

    return NextResponse.json({ url: result.init_point });
    
  } catch (error: any) {
    console.error("❌ ERRO NO CHECKOUT:", error);
    return NextResponse.json({ error: 'Erro interno ao processar agendamento.' }, { status: 500 });
  }
}