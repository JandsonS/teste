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
    // 1️⃣ REGRA DE OURO: VARREDURA COMPLETA DO HORÁRIO
    // =========================================================================
    // Buscamos TODAS as fichas desse horário (não apenas a primeira)
    const agendamentosNoHorario = await prisma.agendamento.findMany({
      where: {
        data: date,
        horario: time,
        status: { not: 'CANCELADO' } // Ignora cancelados
      }
    });

    // VERIFICAÇÃO 1: Existe algum PAGAMENTO CONFIRMADO ou LOCAL?
    const existeBloqueioTotal = agendamentosNoHorario.some(a => 
      a.status === 'PAGO' || a.status === 'AGENDADO_LOCAL'
    );

    if (existeBloqueioTotal) {
      return NextResponse.json(
        { error: 'Este horário já está reservado e pago. Não é possível agendar.' }, 
        { status: 409 }
      );
    }

    // VERIFICAÇÃO 2: Existe algum PENDENTE válido (menos de 10 min)?
    // Se existir PENDENTE velho, nós vamos apagar agora.
    const agora = new Date().getTime();
    let horarioLivre = true;

    for (const item of agendamentosNoHorario) {
      if (item.status === 'PENDENTE') {
        const tempoDecorrido = (agora - new Date(item.createdAt).getTime()) / 1000 / 60;
        
        if (tempoDecorrido < 10) {
          // Tem alguém tentando pagar AGORA. Bloqueia.
          return NextResponse.json(
            { error: 'Horário em processo de pagamento por outro cliente. Tente em 10 minutos ou escolha outro horário.' }, 
            { status: 409 }
          );
        } else {
          // Pendente velho (> 10 min). Vamos limpar essa sujeira do banco.
          console.log(`🗑️ Limpando agendamento expirado de ${item.cliente}...`);
          await prisma.agendamento.delete({ where: { id: item.id } });
        }
      }
    }

    // =========================================================================
    // 2️⃣ REGRA DO CLIENTE (Não pode ter duas reservas ativas no dia)
    // =========================================================================
    const reservasDoCliente = await prisma.agendamento.findMany({
      where: {
        cliente: clientName,
        data: date,
        status: { not: 'CANCELADO' }
      }
    });

    const jaTemReserva = reservasDoCliente.find(item => {
      // Se já pagou, conta.
      if (item.status === 'PAGO' || item.status === 'AGENDADO_LOCAL') return true;
      // Se é pendente recente, conta.
      if (item.status === 'PENDENTE') {
        const diff = (agora - new Date(item.createdAt).getTime()) / 1000 / 60;
        return diff < 10;
      }
      return false;
    });

    if (jaTemReserva) {
      return NextResponse.json(
        { error: `Você já possui um agendamento ativo para hoje às ${jaTemReserva.horario}.` }, 
        { status: 409 }
      );
    }

    // =========================================================================
    // 3️⃣ CRIAÇÃO (Sinal Verde)
    // =========================================================================
    
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

    const agendamento = await prisma.agendamento.create({
      data: {
        cliente: clientName,
        servico: title,
        data: date,
        horario: time,
        valor: Number(price),
        status: "PENDENTE",
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
    console.error("❌ ERRO SERVER:", error);
    return NextResponse.json({ error: 'Erro interno.' }, { status: 500 });
  }
}