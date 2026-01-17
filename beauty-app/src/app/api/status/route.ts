import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { MercadoPagoConfig, Payment } from 'mercadopago';

const globalForPrisma = global as unknown as { prisma: PrismaClient };
const prisma = globalForPrisma.prisma || new PrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

// Configuração do Mercado Pago (igual no payment)
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

    // 2. SE JÁ ESTIVER PAGO, RETORNA LOGO (RÁPIDO) 🚀
    if (agendamento.status === 'PAGO' || agendamento.status === 'AGENDADO_LOCAL') {
      return NextResponse.json(agendamento);
    }

    // 3. SE ESTIVER PENDENTE, VAMOS BUSCAR NO MERCADO PAGO À FORÇA (VERIFICAÇÃO ATIVA) 🕵️‍♂️
    if (agendamento.status === 'PENDENTE') {
      try {
        console.log(`🕵️ Verificando status no MP para agendamento: ${id}`);
        const payment = new Payment(client);
        
        // Buscamos se existe algum pagamento APROVADO com a referência desse agendamento
        const busca = await payment.search({
          options: {
            external_reference: id,
            status: 'approved',
            limit: 1
          }
        });

        // SE ACHAMOS UM PAGAMENTO APROVADO NO MERCADO PAGO...
        if (busca.results && busca.results.length > 0) {
          const pagamentoMP = busca.results[0];
          console.log(`✅ Pagamento encontrado no MP! Atualizando banco...`);

          // ...ATUALIZAMOS O BANCO AGORA MESMO!
          const agendamentoAtualizado = await prisma.agendamento.update({
            where: { id: id },
            data: { 
              status: 'PAGO',
              paymentId: String(pagamentoMP.id)
            }
          });

          // Retornamos o dado já atualizado para a tela ficar verde
          return NextResponse.json(agendamentoAtualizado);
        }

      } catch (mpError) {
        console.error("Erro ao consultar MP:", mpError);
        // Se der erro no MP, continuamos retornando o status PENDENTE original
      }
    }

    // Se não achou nada novo, retorna o status atual (PENDENTE)
    return NextResponse.json(agendamento);

  } catch (error) {
    console.error("Erro na API status:", error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}