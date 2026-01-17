import { NextResponse } from 'next/server';
import { MercadoPagoConfig, Payment } from 'mercadopago'; // <--- Mudou para Payment
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
    const { title, price, date, time, clientName, method, email } = body; // Adicione email se tiver

    console.log(`🔒 Criando pagamento Pix para: ${clientName}`);

    // 1️⃣ VALIDAÇÕES (Mantemos a mesma segurança de antes)
    const agendamentosNoHorario = await prisma.agendamento.findMany({
      where: { data: date, horario: time, status: { not: 'CANCELADO' } }
    });

    if (agendamentosNoHorario.some(a => a.status === 'PAGO' || a.status === 'AGENDADO_LOCAL')) {
      return NextResponse.json({ error: 'Horário já ocupado.' }, { status: 409 });
    }
    
    // (Lógica de limpeza de pendentes mantida...)
    const agora = new Date().getTime();
    for (const item of agendamentosNoHorario) {
      if (item.status === 'PENDENTE') {
        const diff = (agora - new Date(item.createdAt).getTime()) / 1000 / 60;
        if (diff < 10) return NextResponse.json({ error: 'Horário em pagamento.' }, { status: 409 });
        await prisma.agendamento.delete({ where: { id: item.id } });
      }
    }

    // 2️⃣ CRIAÇÃO NO BANCO DE DADOS
    if (method === 'LOCAL') {
       // ... (Código Local mantido igual)
       return NextResponse.json({ success: true });
    }

    const agendamento = await prisma.agendamento.create({
      data: {
        cliente: clientName, servico: title, data: date, horario: time, valor: Number(price), status: "PENDENTE",
      }
    });

    // 3️⃣ CRIAÇÃO DO PAGAMENTO PIX (A Grande Mudança)
    const payment = new Payment(client);
    
    const result = await payment.create({
        body: {
            transaction_amount: Number(price),
            description: `${title} - ${date} às ${time}`,
            payment_method_id: 'pix',
            payer: {
                email: email || 'cliente@email.com', // O MP exige um email, mesmo que fake
                first_name: clientName
            },
            external_reference: agendamento.id, // VITAL: Liga o Pix ao Agendamento
            notification_url: 'https://teste-drab-rho-60.vercel.app/api/webhook' // Seu Webhook
        }
    });

    // Retornamos o ID do pagamento para o Frontend exibir o Brick
    return NextResponse.json({ paymentId: result.id });
    
  } catch (error: any) {
    console.error("❌ ERRO SERVER:", error);
    return NextResponse.json({ error: 'Erro interno.' }, { status: 500 });
  }
}