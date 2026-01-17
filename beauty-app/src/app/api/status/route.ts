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

    // ✅ VERIFICAÇÃO INTELIGENTE: Se contém "PAGO" no nome (ex: "PAGO VIA PIX"), já libera
    if (agendamento.status.includes('PAGO') || agendamento.status === 'PAGAR NO LOCAL') {
      return NextResponse.json(agendamento);
    }

    // Busca Ativa no MP (Caso o webhook atrase)
    if (agendamento.status === 'PENDENTE') {
      try {
        const payment = new Payment(client);
        const busca = await payment.search({
          options: { external_reference: id, status: 'approved', limit: 1 }
        });

        if (busca.results && busca.results.length > 0) {
          const p = busca.results[0];
          
          // Formata o nome bonitinho igual ao Webhook
          let statusDetalhado = "PAGO";
          if (p.payment_type_id === 'bank_transfer' || p.payment_type_id === 'pix') statusDetalhado = "PAGO VIA PIX";
          else if (p.payment_type_id === 'credit_card') statusDetalhado = "PAGO VIA CARTÃO";

          const atualizado = await prisma.agendamento.update({
            where: { id: id },
            data: { status: statusDetalhado, paymentId: String(p.id) }
          });
          return NextResponse.json(atualizado);
        }
      } catch (mpError) {
        console.error("Erro MP:", mpError);
      }
    }

    return NextResponse.json(agendamento);
  } catch (error) {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}