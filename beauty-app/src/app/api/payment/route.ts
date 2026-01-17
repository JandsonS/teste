import { NextResponse } from 'next/server';
import { MercadoPagoConfig, Payment } from 'mercadopago'; // <--- IMPORTANTE: Payment
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
    const { title, price, date, time, clientName, method, email } = body;

    console.log(`🔒 Criando pagamento Pix (Brick) para: ${clientName}`);

    // === VALIDAÇÕES (Segurança) ===
    const agendamentosNoHorario = await prisma.agendamento.findMany({
      where: { data: date, horario: time, status: { not: 'CANCELADO' } }
    });

    if (agendamentosNoHorario.some(a => a.status === 'PAGO' || a.status === 'AGENDADO_LOCAL')) {
      return NextResponse.json({ error: 'Horário já ocupado.' }, { status: 409 });
    }
    
    // Limpa pendentes antigos
    const agora = new Date().getTime();
    for (const item of agendamentosNoHorario) {
      if (item.status === 'PENDENTE') {
        const diff = (agora - new Date(item.createdAt).getTime()) / 1000 / 60;
        if (diff < 10) return NextResponse.json({ error: 'Horário em pagamento.' }, { status: 409 });
        await prisma.agendamento.delete({ where: { id: item.id } });
      }
    }

    // Verifica duplicidade do cliente
    const reservasDoCliente = await prisma.agendamento.findMany({
        where: { cliente: clientName, data: date, status: { not: 'CANCELADO' } }
    });
    if (reservasDoCliente.some(item => item.status === 'PAGO' || item.status === 'AGENDADO_LOCAL' || (item.status === 'PENDENTE' && (agora - new Date(item.createdAt).getTime()) / 1000 / 60 < 10))) {
        return NextResponse.json({ error: 'Você já tem um agendamento hoje.' }, { status: 409 });
    }

    // === CRIAÇÃO ===
    if (method === 'LOCAL') {
      await prisma.agendamento.create({
        data: { cliente: clientName, servico: title, data: date, horario: time, valor: Number(price), status: "AGENDADO_LOCAL" }
      });
      return NextResponse.json({ success: true });
    }

    // Cria no Banco
    const agendamento = await prisma.agendamento.create({
      data: { cliente: clientName, servico: title, data: date, horario: time, valor: Number(price), status: "PENDENTE" }
    });

    // Cria no Mercado Pago (Payment API)
    const payment = new Payment(client);
    
    const result = await payment.create({
        body: {
            transaction_amount: Number(price),
            description: `${title} - ${date} às ${time}`,
            payment_method_id: 'pix',
            payer: {
                email: email || 'cliente@email.com',
                first_name: clientName
            },
            external_reference: agendamento.id,
            notification_url: 'https://teste-drab-rho-60.vercel.app/api/webhook' 
        }
    });

    // Retorna o paymentId para o Brick
    return NextResponse.json({ paymentId: result.id });
    
  } catch (error: any) {
    console.error("❌ ERRO SERVER:", error);
    return NextResponse.json({ error: 'Erro interno.' }, { status: 500 });
  }
}