import { NextResponse } from "next/server";
import { MercadoPagoConfig, Payment } from "mercadopago";
import { PrismaClient } from "@prisma/client";

const globalForPrisma = global as unknown as { prisma: PrismaClient };
const prisma = globalForPrisma.prisma || new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

const client = new MercadoPagoConfig({
  accessToken: process.env.MP_ACCESS_TOKEN!,
});

export async function POST(request: Request) {
  try {
    // 1. Ler o CORPO da notificação (JSON), que é onde o MP manda os dados hoje em dia
    const body = await request.json();
    
    // Log para você ver no painel da Vercel o que está chegando (ajuda muito a debugar)
    console.log("🔔 Webhook recebeu:", JSON.stringify(body));

    // O Mercado Pago manda o ID de formas diferentes dependendo da versão.
    // Aqui pegamos das duas formas possíveis para garantir.
    const action = body.action;
    const type = body.type;
    let id = body.data?.id || body.id; // Tenta pegar de data.id ou id direto

    // Só prosseguimos se for um aviso de PAGAMENTO (payment)
    if (action === "payment.created" || action === "payment.updated" || type === "payment") {
      
      if (!id) {
         console.error("❌ ID do pagamento não encontrado no corpo do webhook.");
         return NextResponse.json({ received: true }, { status: 200 });
      }

      // 2. SEGURANÇA: Vamos no Mercado Pago confirmar se esse ID existe e o status atual
      const payment = new Payment(client);
      const paymentInfo = await payment.get({ id: id });

      console.log(`🔎 Verificando pagamento ${id}. Status atual: ${paymentInfo.status}`);

      // 3. Se estiver APROVADO, atualizamos o banco
      if (paymentInfo.status === "approved") {
        
        const agendamentoId = paymentInfo.external_reference;

        if (agendamentoId) {
          await prisma.agendamento.update({
            where: { id: agendamentoId },
            data: { 
              status: "PAGO",
              paymentId: String(id) 
            },
          });
          console.log(`✅ SUCESSO! Agendamento ${agendamentoId} confirmado.`);
        } else {
            console.warn("⚠️ Pagamento aprovado sem external_reference (agendamentoId).");
        }
      }
    }

    return NextResponse.json({ received: true }, { status: 200 });

  } catch (error) {
    console.error("❌ Erro no Webhook:", error);
    // Retornamos 200 para o Mercado Pago não achar que o servidor caiu
    return NextResponse.json({ received: true }, { status: 200 });
  }
}