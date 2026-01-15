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

    console.log("Verificando regras para:", { clientName, date, time });

    // --- REGRA 1: O HORÁRIO JÁ ESTÁ OCUPADO? (Proteção de Vaga) ---
    const horarioOcupado = await prisma.agendamento.findFirst({
      where: {
        data: date,
        horario: time
      }
    });

    if (horarioOcupado) {
      return NextResponse.json(
        { error: 'Esse horário já está reservado. Por favor, escolha outro.' }, 
        { status: 409 } 
      );
    }

    // --- REGRA 2: O CLIENTE JÁ MARCOU ESSE SERVIÇO HOJE? (Proteção de Spam/Erro) ---
    // Verifica se já existe um agendamento com: Mesmo Nome + Mesma Data + Mesmo Serviço
    const duplicidadeCliente = await prisma.agendamento.findFirst({
      where: {
        cliente: clientName, // Mesmo nome
        data: date,          // Mesmo dia
        servico: title       // Mesmo serviço
        // NOTA: Não filtramos o horário aqui, pois queremos bloquear em QUALQUER horário do dia
      }
    });

    if (duplicidadeCliente) {
      // Se achou, devolve erro avisando para entrar em contato
      return NextResponse.json(
        { error: `Você já tem um agendamento de ${title} para este dia (${duplicidadeCliente.horario}). Para alterar, entre em contato pelo WhatsApp.` }, 
        { status: 409 } 
      );
    }

    // --- SE PASSOU NAS DUAS REGRAS, SEGUE O BAILE ---
    
    // 1. Salva no banco (Status PENDENTE)
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

    // 2. Cria preferência no Mercado Pago
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