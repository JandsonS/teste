import { NextResponse } from 'next/server';
import { MercadoPagoConfig, Preference } from 'mercadopago';
import { SITE_CONFIG } from '@/constants/info';
import { PrismaClient } from '@prisma/client';

// 1. CONEXÃO SEGURA COM O BANCO (PRISMA):
// Esse bloco evita criar múltiplas conexões quando você salva o arquivo no VS Code.
const globalForPrisma = global as unknown as { prisma: PrismaClient };
const prisma = globalForPrisma.prisma || new PrismaClient();
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

// 2. CONFIGURAÇÃO MERCADO PAGO:
const client = new MercadoPagoConfig({ 
  accessToken: process.env.MP_ACCESS_TOKEN! 
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // Agora recebemos mais dados para salvar no banco
    const { title, price, date, time, clientName } = body;

    console.log("Iniciando agendamento para:", clientName, date, time);

    // 3. O PULO DO GATO: TRAVA DE SEGURANÇA 🔒
    // Tentamos criar o agendamento no banco PRIMEIRO.
    // Se já existir alguém nesse dia+hora, o Prisma vai dar erro e pular pro 'catch'.
    const agendamento = await prisma.agendamento.create({
      data: {
        cliente: clientName,
        servico: title,
        data: date,
        horario: time,
        valor: Number(price),
        status: "PENDENTE", // Começa como Pendente
      }
    });

    // 4. SE PASSOU, GERA O PAGAMENTO NO MERCADO PAGO 💰
    const preference = new Preference(client);

    const result = await preference.create({
      body: {
        items: [
          {
            id: agendamento.id, // Usamos o ID real do banco agora!
            title: `${title} - ${date} às ${time}`, // Título mais explicativo no extrato
            unit_price: Number(price),
            quantity: 1,
          },
        ],
        back_urls: {
          // Adicionamos o ID na URL de sucesso para gerar o comprovante depois
          success: `${SITE_CONFIG.url}/sucesso?id=${agendamento.id}`,
          failure: `${SITE_CONFIG.url}/`,
          pending: `${SITE_CONFIG.url}/`,
        },
        auto_return: 'approved',
        external_reference: agendamento.id, // Linkamos o pagamento ao agendamento
      },
    });

    return NextResponse.json({ url: result.init_point });
    
  } catch (error: any) {
    // 5. TRATAMENTO DE CONFLITO DE HORÁRIO 🚫
    // Se o erro for código 'P2002', significa que violou a regra @@unique do banco.
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'Ops! Esse horário acabou de ser reservado por outra pessoa. Tente outro!' }, 
        { status: 409 } // 409 Conflict
      );
    }

    console.error("Erro no processamento:", error);
    return NextResponse.json({ error: 'Erro ao criar agendamento' }, { status: 500 });
  }
}