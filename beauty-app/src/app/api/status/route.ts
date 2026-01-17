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

    const agendamento = await prisma.agendamento.findUnique({ where: { id: id } });
    if (!agendamento) return NextResponse.json({ error: 'Não encontrado' }, { status: 404 });

    // Se já pagou, retorna logo
    if (agendamento.status === 'PAGO') return NextResponse.json(agendamento);

    // Se está pendente, BUSCA NO MP (Modo Turbo)
    if (agendamento.status === 'PENDENTE') {
      try {
        const payment = new Payment(client);
        // Busca os últimos 20 pagamentos da conta
        const busca = await payment.search({
          options: { limit: 20, sort: 'date_created', criteria: 'desc' }
        });

        // Procura MANUALMENTE o nosso ID na lista
        const achou = busca.results?.find(p => p.external_reference === id && p.status === 'approved');

        if (achou) {
          console.log("✅ Pagamento encontrado via Busca Ativa!");
          const atualizado = await prisma.agendamento.update({
            where: { id: id },
            data: { status: 'PAGO', paymentId: String(achou.id) }
          });
          return NextResponse.json(atualizado);
        }
      } catch (e) {
        console.error("Erro MP:", e);
      }
    }

    return NextResponse.json(agendamento);
  } catch (error) {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}