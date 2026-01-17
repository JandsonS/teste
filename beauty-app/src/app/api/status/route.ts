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

    // 1. O Banco diz que já pagou?
    const agendamento = await prisma.agendamento.findUnique({ where: { id: id } });
    if (!agendamento) return NextResponse.json({ error: 'Não encontrado' }, { status: 404 });

    if (agendamento.status === 'PAGO' || agendamento.status === 'AGENDADO_LOCAL') {
      return NextResponse.json(agendamento);
    }

    // 2. Se não, vamos perguntar pro Mercado Pago AGORA (Busca Ativa)
    if (agendamento.status === 'PENDENTE') {
      try {
        const payment = new Payment(client);
        // Busca pagamentos recentes que tenham essa referência externa
        const busca = await payment.search({
          options: {
            external_reference: id, 
            status: 'approved',
            limit: 1
          }
        });

        if (busca.results && busca.results.length > 0) {
          const pagamentoMP = busca.results[0];
          console.log(`✅ Pagamento Pix encontrado na busca ativa! ID: ${pagamentoMP.id}`);

          // Atualiza o banco na hora
          const atualizado = await prisma.agendamento.update({
            where: { id: id },
            data: { status: 'PAGO', paymentId: String(pagamentoMP.id) }
          });
          return NextResponse.json(atualizado);
        }
      } catch (mpError) {
        console.error("Erro busca MP:", mpError);
      }
    }

    return NextResponse.json(agendamento);

  } catch (error) {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}