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
    const { title, price, date, time, clientName } = body;

    console.log("Verificando disponibilidade:", { date, time });

    // 1. O VAR (VERIFICAÇÃO DE SEGURANÇA) 🕵️‍♂️
    // Antes de qualquer coisa, pergunta pro banco: "Já tem alguém nesse horário?"
    const horarioOcupado = await prisma.agendamento.findFirst({
      where: {
        data: date,
        horario: time
      }
    });

    // Se o VAR pegou impedimento:
    if (horarioOcupado) {
      console.log("BLOQUEIO: Horário já reservado.");
      return NextResponse.json(
        { error: 'Ops! Esse horário já está reservado. Por favor, escolha um horário diferente.' }, 
        { status: 409 } // 409 = Conflito
      );
    }

    // 2. CAMINHO LIVRE -> SALVA NO BANCO
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

    // 3. GERA O LINK DE PAGAMENTO
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
    console.error("ERRO CRÍTICO:", error);
    return NextResponse.json({ error: 'Erro interno no servidor.' }, { status: 500 });
  }
}