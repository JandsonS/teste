import { NextResponse } from 'next/server';
import { MercadoPagoConfig, Preference } from 'mercadopago';
import { SITE_CONFIG } from '@/constants/info';
import { PrismaClient } from '@prisma/client';

// 1. Conexão com o Banco (Padrão Prisma 5)
const globalForPrisma = global as unknown as { prisma: PrismaClient };
const prisma = globalForPrisma.prisma || new PrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

const client = new MercadoPagoConfig({ 
  accessToken: process.env.MP_ACCESS_TOKEN! 
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // LOG DE DEPURAÇÃO (Olhe no terminal o que vai aparecer aqui!)
    console.log("RECEBI DO FRONTEND:", body);

    const { title, price, date, time, clientName } = body;

    // VERIFICAÇÃO DE SEGURANÇA
    // Se faltar algum dado, a gente avisa antes de quebrar o Prisma
    if (!clientName || !date || !time) {
      console.error("ERRO: Dados incompletos recebidos.");
      return NextResponse.json(
        { error: 'Dados do agendamento incompletos (Nome, Data ou Hora faltando).' }, 
        { status: 400 }
      );
    }

    console.log(`Tentando salvar: ${clientName} - ${date} às ${time}`);

    // 2. CRIA NO BANCO
    const agendamento = await prisma.agendamento.create({
      data: {
        cliente: clientName, // Agora temos certeza que não é undefined
        servico: title,
        data: date,
        horario: time,
        valor: Number(price),
        status: "PENDENTE",
      }
    });

    console.log("Salvo no banco com ID:", agendamento.id);

    // 3. GERA O PAGAMENTO
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
    
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'Ops! Esse horário já foi reservado.' }, 
        { status: 409 }
      );
    }
    return NextResponse.json({ error: 'Erro interno ao processar.' }, { status: 500 });
  }
}