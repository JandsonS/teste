import { NextResponse } from 'next/server';
import { MercadoPagoConfig, Preference } from 'mercadopago';
import { SITE_CONFIG } from '@/constants/info';
import { PrismaClient } from '@prisma/client';

// 1. CONEXÃO SEGURA COM O BANCO (PRISMA)
const globalForPrisma = global as unknown as { prisma: PrismaClient };

// AQUI ESTÁ A MÁGICA 🪄:
// O // @ts-ignore diz para o editor ignorar o erro na linha de baixo
const prisma = globalForPrisma.prisma || new PrismaClient({
  // @ts-ignore
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
});

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

// 2. CONFIGURAÇÃO MERCADO PAGO
const client = new MercadoPagoConfig({ 
  accessToken: process.env.MP_ACCESS_TOKEN! 
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { title, price, date, time, clientName } = body;

    console.log("Tentando agendar:", { clientName, date, time });

    // 3. TENTA RESERVAR O HORÁRIO NO BANCO 🔒
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

    console.log("Agendamento criado! ID:", agendamento.id);

    // 4. GERA O PAGAMENTO NO MERCADO PAGO 💰
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
    console.error("ERRO DETALHADO:", error);

    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'Ops! Esse horário acabou de ser reservado.' }, 
        { status: 409 }
      );
    }

    return NextResponse.json({ error: 'Erro ao processar agendamento.' }, { status: 500 });
  }
}