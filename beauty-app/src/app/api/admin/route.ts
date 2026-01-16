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
    const { title, price, date, time, clientName, method } = body;

    console.log(`Verificando agendamento (${method || 'ONLINE'}):`, { clientName, date, time });

    // 1. O VAR INTELIGENTE ATUALIZADO 🧠
    // Agora ele busca se existe agendamento nessa hora que NÃO SEJA "CANCELADO"
    const agendamentoExistente = await prisma.agendamento.findFirst({
      where: { 
        data: date, 
        horario: time,
        status: {
            not: 'CANCELADO' // <--- A MÁGICA: Ignora os cancelados e libera a vaga!
        }
      }
    });

    let horarioLivre = true;

    if (agendamentoExistente) {
      // Se já estiver PAGO ou for NO LOCAL, está ocupado
      if (agendamentoExistente.status === 'PAGO' || agendamentoExistente.status === 'AGENDADO_LOCAL') {
        horarioLivre = false;
      } 
      // Se estiver PENDENTE, aplicamos a Regra de Tolerância (20 minutos) ⏳
      else if (agendamentoExistente.status === 'PENDENTE') {
        const dataCriacao = new Date(agendamentoExistente.createdAt);
        const agora = new Date();
        const diferencaEmMinutos = (agora.getTime() - dataCriacao.getTime()) / 1000 / 60;

        if (diferencaEmMinutos < 20) {
          // Se foi criado a menos de 20 min, ainda está reservado
          horarioLivre = false;
        } else {
          // Se passou de 20 min e não pagou, consideramos LIVRE
          // Obs: Como removemos o Unique, podemos deletar o velho ou só ignorar. 
          // Vamos deletar para limpar o banco.
          console.log("Horário pendente expirado. Liberando para novo cliente...");
          await prisma.agendamento.delete({ where: { id: agendamentoExistente.id } });
          horarioLivre = true;
        }
      }
    }

    if (!horarioLivre) {
      return NextResponse.json(
        { error: 'Esse horário já está reservado (ou em processo de pagamento).' }, 
        { status: 409 } 
      );
    }

    // 2. VERIFICAÇÃO DE CLIENTE (Mantida igual)
    const historicoCliente = await prisma.agendamento.findMany({
      where: { cliente: clientName }
    });
    
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0); 
    const agendamentoPendente = historicoCliente.find((item) => {
      const [dia, mes, ano] = item.data.split('/').map(Number);
      const dataItem = new Date(ano, mes - 1, dia);
      // Aqui já ignorava cancelado, então está ok!
      return dataItem >= hoje && item.status !== 'CANCELADO' && item.status !== 'PENDENTE'; 
    });

    if (agendamentoPendente) {
        return NextResponse.json(
          { error: `Você já possui um agendamento confirmado para o dia ${agendamentoPendente.data}.` }, 
          { status: 409 } 
        );
    }

    // 3. CRIAÇÃO (LOCAL ou ONLINE)
    if (method === 'LOCAL') {
      await prisma.agendamento.create({
        data: {
          cliente: clientName,
          servico: title,
          data: date,
          horario: time,
          valor: Number(price),
          status: "AGENDADO_LOCAL", 
        }
      });
      return NextResponse.json({ success: true });
    }

    // ONLINE
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
        notification_url: `${SITE_CONFIG.url}/api/webhook`,
      },
    });

    return NextResponse.json({ url: result.init_point });
    
  } catch (error: any) {
    console.error("ERRO NO SERVIDOR:", error);
    return NextResponse.json({ error: 'Erro interno.' }, { status: 500 });
  }
}