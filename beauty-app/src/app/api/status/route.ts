import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { MercadoPagoConfig, Payment } from 'mercadopago';

const globalForPrisma = global as unknown as { prisma: PrismaClient };
const prisma = globalForPrisma.prisma || new PrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

const client = new MercadoPagoConfig({ 
  accessToken: process.env.MP_ACCESS_TOKEN! 
});

export async function POST(request: Request) {
  try {
    const { id } = await request.json();
    if (!id) return NextResponse.json({ error: 'ID faltando' }, { status: 400 });

    // 1. Busca no Banco
    const agendamento = await prisma.agendamento.findUnique({ where: { id: id } });
    if (!agendamento) return NextResponse.json({ error: 'Agendamento não encontrado no banco' }, { status: 404 });

    // Se já está pago, retorna logo
    if (agendamento.status === 'PAGO' || agendamento.status === 'AGENDADO_LOCAL') {
      return NextResponse.json(agendamento);
    }

    // 2. Se está PENDENTE, vai no Mercado Pago confirmar
    if (agendamento.status === 'PENDENTE') {
      try {
        console.log(`🕵️ Verificando MP para ID: ${id}`);
        const payment = new Payment(client);
        
        // Busca os últimos 30 pagamentos (aumentei o limite para garantir)
        const busca = await payment.search({
          options: { limit: 30, sort: 'date_created', criteria: 'desc' }
        });

        // Procura MANUALMENTE o ID na lista
        const pagamentoEncontrado = busca.results?.find(p => 
            p.external_reference === id && p.status === 'approved'
        );

        if (pagamentoEncontrado) {
          console.log(`✅ PAGAMENTO ACHADO! Atualizando banco...`);
          const atualizado = await prisma.agendamento.update({
            where: { id: id },
            data: { status: 'PAGO', paymentId: String(pagamentoEncontrado.id) }
          });
          return NextResponse.json(atualizado);
        } else {
            console.log(`⏳ Pagamento ainda não consta na lista recente do MP.`);
        }

      } catch (mpError: any) {
        console.error("❌ Erro de conexão com Mercado Pago:", mpError);
        // Não retorna erro 500 para não quebrar a tela do usuário, apenas mantém pendente
      }
    }

    return NextResponse.json(agendamento);

  } catch (error) {
    console.error("❌ Erro geral na API Status:", error);
    return NextResponse.json({ error: 'Erro interno no servidor' }, { status: 500 });
  }
}