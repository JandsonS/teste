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

    // 1. Busca o agendamento no banco
    const agendamento = await prisma.agendamento.findUnique({
      where: { id: id },
    });

    if (!agendamento) return NextResponse.json({ error: 'Não encontrado' }, { status: 404 });

    // 2. Se já estiver PAGO, retorna logo e economiza tempo 🚀
    if (agendamento.status === 'PAGO' || agendamento.status === 'AGENDADO_LOCAL') {
      return NextResponse.json(agendamento);
    }

    // 3. VERIFICAÇÃO "MODO TURBO" (Igual ao Debug) ⚡
    // Em vez de filtrar, buscamos os últimos 20 pagamentos e procuramos nós mesmos
    if (agendamento.status === 'PENDENTE') {
      try {
        console.log(`🕵️ Buscando pagamento para a referência: ${id}`);
        const payment = new Payment(client);
        
        const busca = await payment.search({
          options: {
            limit: 20, // Trazemos os 20 últimos para garantir
            sort: 'date_created',
            criteria: 'desc'
          }
        });

        // 4. Procuramos manualmente na lista (Isso evita bugs de indexação do MP)
        const pagamentoEncontrado = busca.results?.find(p => 
            p.external_reference === id && p.status === 'approved'
        );

        if (pagamentoEncontrado) {
          console.log(`✅ ACHAMOS! Pagamento ID ${pagamentoEncontrado.id} confirmado.`);

          // Atualiza o banco na hora!
          const agendamentoAtualizado = await prisma.agendamento.update({
            where: { id: id },
            data: { 
              status: 'PAGO',
              paymentId: String(pagamentoEncontrado.id)
            }
          });

          return NextResponse.json(agendamentoAtualizado);
        } else {
            console.log("⏳ Pagamento ainda não encontrado na lista recente.");
        }

      } catch (mpError) {
        console.error("Erro ao consultar MP:", mpError);
      }
    }

    return NextResponse.json(agendamento);

  } catch (error) {
    console.error("Erro na API status:", error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}