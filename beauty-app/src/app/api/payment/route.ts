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
    const { title, price, date, time, clientName, method } = body; // Adicionamos 'method'

    console.log(`Processando agendamento (${method || 'ONLINE'}):`, { clientName, date, time });

    // 1. O VAR: HORÁRIO OCUPADO? 🛑
    const horarioOcupado = await prisma.agendamento.findFirst({
      where: { data: date, horario: time }
    });

    if (horarioOcupado) {
      return NextResponse.json(
        { error: 'Esse horário já está reservado. Por favor, escolha outro.' }, 
        { status: 409 } 
      );
    }

    // 2. O VAR: DUPLICIDADE DE CLIENTE? 🛑
    const duplicidadeCliente = await prisma.agendamento.findFirst({
      where: { cliente: clientName, data: date, servico: title }
    });

    if (duplicidadeCliente) {
      return NextResponse.json(
        { error: `Você já tem um agendamento de ${title} hoje às ${duplicidadeCliente.horario}. Fale no WhatsApp para mudar.` }, 
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
          status: "AGENDADO_LOCAL", // Status diferente para você saber que vai pagar lá
        }
      });
      
      // Retorna sucesso sem link de pagamento
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