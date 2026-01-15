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

    console.log(`Verificando agendamento (${method || 'ONLINE'}):`, { clientName, date, time });

    // 1. O VAR: HORÁRIO EXATO OCUPADO? 🛑
    const horarioOcupado = await prisma.agendamento.findFirst({
      where: { data: date, horario: time }
    });

    if (horarioOcupado) {
      return NextResponse.json(
        { error: 'Esse horário já está reservado. Por favor, escolha outro.' }, 
        { status: 409 } 
      );
    }

    // 2. O VAR: CLIENTE JÁ TEM AGENDAMENTO FUTURO? 🛑
    // Essa é a regra nova: Busca TODOS os agendamentos desse nome
    const historicoCliente = await prisma.agendamento.findMany({
      where: { cliente: clientName }
    });

    // Vamos verificar se existe algum agendamento ATIVO de hoje em diante
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0); // Zera a hora para comparar apenas a data

    const agendamentoPendente = historicoCliente.find((item) => {
      // Converte a data string "dd/MM/yyyy" para Objeto Date do Javascript
      const [dia, mes, ano] = item.data.split('/').map(Number);
      const dataItem = new Date(ano, mes - 1, dia);

      // Se a data do agendamento for HOJE ou FUTURO, e não estiver cancelado
      // Bloqueia!
      return dataItem >= hoje && item.status !== 'CANCELADO';
    });

    if (agendamentoPendente) {
      return NextResponse.json(
        { error: `Você já possui um agendamento ativo para o dia ${agendamentoPendente.data} às ${agendamentoPendente.horario}. Caso precise cancelar ou alterar, entre em contato com o estabelecimento.` }, 
        { status: 409 } 
      );
    }

    // 3. SE FOR "PAGAR NO LOCAL" (APENAS RESERVA) 📝
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

    // 4. SE FOR ONLINE (GERA MERCADO PAGO) 💳
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
      },
    });

    return NextResponse.json({ url: result.init_point });
    
  } catch (error: any) {
    console.error("ERRO NO SERVIDOR:", error);
    return NextResponse.json({ error: 'Erro interno ao processar agendamento.' }, { status: 500 });
  }
}