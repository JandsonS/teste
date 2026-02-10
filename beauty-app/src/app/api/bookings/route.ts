import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { PrismaClient } from "@prisma/client";
import { MercadoPagoConfig, Payment } from "mercadopago";

// Padrão Singleton do Prisma
const globalForPrisma = global as unknown as { prisma: PrismaClient };
const prisma = globalForPrisma.prisma || new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

// =================================================================
// 1. CRIAR AGENDAMENTO E GERAR PIX (POST)
// =================================================================
export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // Normalização de dados (Aceita name ou clientName, etc)
    const nomeFinal = body.name || body.clientName;
    const telefoneFinal = body.phone || body.clientPhone;
    const { date, time, serviceName, price, establishmentId, paymentType, slug } = body;

    // --- VALIDAÇÃO ---
    if (!nomeFinal || !price || (!establishmentId && !slug)) {
        return NextResponse.json({ error: "Dados incompletos" }, { status: 400 });
    }

    // Descobre o ID da loja se veio apenas o Slug
    let lojaId = establishmentId;
    let tokenDaLoja = process.env.MP_ACCESS_TOKEN; // Token padrão (.env)

    // Se tiver ID ou Slug, busca configurações da loja
    if (lojaId || slug) {
        const loja = await prisma.estabelecimento.findFirst({
            where: { OR: [{ id: lojaId }, { slug: slug }] }
        });
        
        if (loja) {
            lojaId = loja.id;
            if (loja.mercadoPagoToken) {
                tokenDaLoja = loja.mercadoPagoToken; // Usa token da loja se existir
            }
        }
    }

    if (!tokenDaLoja) return NextResponse.json({ error: "Configuração de pagamento ausente" }, { status: 500 });

    // --- CRIA PIX NO MERCADO PAGO ---
    const client = new MercadoPagoConfig({ accessToken: tokenDaLoja });
    const payment = new Payment(client);

    const valorCobrado = paymentType === 'DEPOSIT' ? (Number(price) * 0.50) : Number(price);

    // ⚠️ ATENÇÃO: Em produção (Vercel), troque isso pela URL do seu site
    // Ex: https://seu-site.vercel.app/api/webhook
    const webhookUrl = process.env.NEXT_PUBLIC_BASE_URL 
        ? `${process.env.NEXT_PUBLIC_BASE_URL}/api/webhook` 
        : "https://tameika-semiexpansible-anthony.ngrok-free.dev/api/webhook"; 

    const mpResponse = await payment.create({
        body: {
            transaction_amount: Number(valorCobrado.toFixed(2)),
            description: `${serviceName} - ${time}`,
            payment_method_id: 'pix',
            payer: {
                email: 'cliente@generico.com',
                first_name: nomeFinal.split(" ")[0],
            },
            notification_url: webhookUrl,
        }
    });

    // --- EXTRAI DADOS ---
    const qrCodeBase64 = mpResponse.point_of_interaction?.transaction_data?.qr_code_base64;
    const qrCodeCopiaCola = mpResponse.point_of_interaction?.transaction_data?.qr_code;
    const paymentId = mpResponse.id;

    // --- SALVA NO BANCO ---
    const novoAgendamento = await prisma.agendamento.create({
      data: {
        cliente: nomeFinal,
        telefone: telefoneFinal,
        data: date, 
        horario: time,
        servico: serviceName,
        valor: valorCobrado, // Salva direto como número
        status: "PENDENTE",
        paymentId: String(paymentId),
        metodoPagamento: "PIX",
        establishmentId: lojaId,
        
      },
    });

    // --- RETORNO BLINDADO ---
    const imagemPronta = `data:image/png;base64,${qrCodeBase64}`;
    
    return NextResponse.json({ 
        success: true, 
        bookingId: novoAgendamento.id,
        qrCode: qrCodeBase64,
        qrCodeBase64: qrCodeBase64,
        image: qrCodeBase64,
        base64: qrCodeBase64,
        fullImage: imagemPronta,
        copiaCola: qrCodeCopiaCola,
        pixCode: qrCodeCopiaCola,
        payload: qrCodeCopiaCola,
        paymentId: paymentId
    });

  } catch (error: any) {
    console.error("ERRO CRÍTICO NO POST:", error);
    return NextResponse.json({ error: error.message || "Erro interno" }, { status: 500 });
  }
}

// =================================================================
// 2. BUSCAR AGENDAMENTOS (GET HÍBRIDO - CORRIGIDO)
// =================================================================
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const bookingId = searchParams.get("bookingId"); 

    // 🔓 MODO PÚBLICO (BLINDADO) - Para o Modal do Cliente
    if (bookingId) {
        const agendamento = await prisma.agendamento.findUnique({
            where: { id: bookingId },
            select: { status: true, id: true } 
        });

        if (!agendamento) return NextResponse.json({ error: "N/A" }, { status: 404 });
        return NextResponse.json(agendamento);
    }

    // 🔐 MODO ADMIN - Para o Painel do Dono
    const cookieStore = await cookies();
    const token = cookieStore.get("admin_session");

    if (!token || token.value !== "true") {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    // 👇 AQUI ESTÁ A CORREÇÃO QUE O SEU CÓDIGO NÃO TINHA 👇
    let establishmentId = searchParams.get("establishmentId");
    const slug = searchParams.get("slug");

    // Se veio o Slug mas não veio o ID, a gente busca o ID no banco
    if (!establishmentId && slug) {
        const loja = await prisma.estabelecimento.findUnique({
            where: { slug: slug },
            select: { id: true }
        });
        if (loja) {
            establishmentId = loja.id;
        }
    }

    if (!establishmentId) {
      return NextResponse.json({ error: "Loja não identificada (Slug ou ID inválido)" }, { status: 400 });
    }
    // 👆 FIM DA CORREÇÃO 👆

    // Faxineiro Automático
    const tempoLimite = new Date(Date.now() - 15 * 60 * 1000); 
    await prisma.agendamento.deleteMany({
      where: { establishmentId: establishmentId, status: 'PENDENTE', createdAt: { lt: tempoLimite } }
    });

    const data = await prisma.agendamento.findMany({
      where: { establishmentId: establishmentId, status: { in: ['CONFIRMADO', 'PAGO', 'CANCELADO'] } },
      orderBy: { createdAt: 'desc' }
    });

    const bookings = data.map((item) => ({
      id: item.id,
      clientName: item.cliente,
      clientPhone: item.telefone || "Não informado",
      serviceTitle: item.servico,
      bookingDate: item.data,
      bookingTime: item.horario,
      status: item.status,
      paymentMethod: item.metodoPagamento || "PIX",
      pricePaid: Number(item.valor),
      priceTotal: Number(item.valor), // Ajuste conforme lógica de negócio
      createdAt: item.createdAt
    }));

    return NextResponse.json(bookings);
    
  } catch (error) {
    console.error("Erro ao buscar:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

// =================================================================
// 3. DELETAR AGENDAMENTO (DELETE)
// =================================================================
export async function DELETE(request: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("admin_session");

    if (!token || token.value !== "true") {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const { id } = await request.json();
    if (!id) return NextResponse.json({ error: "ID não fornecido" }, { status: 400 });

    await prisma.agendamento.delete({ where: { id } });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Erro ao deletar" }, { status: 500 });
  }
}

// =================================================================
// 4. CONFIRMAR PAGAMENTO MANUALMENTE (PATCH)
// =================================================================
export async function PATCH(request: Request) {
    try {
      const cookieStore = await cookies();
      const token = cookieStore.get("admin_session");
  
      if (!token || token.value !== "true") {
        return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
      }
  
      const { id } = await request.json();
  
      const updated = await prisma.agendamento.update({
        where: { id },
        data: { status: 'PAGO' }
      });
  
      return NextResponse.json(updated);
    } catch (error) {
      return NextResponse.json({ error: "Erro ao atualizar" }, { status: 500 });
    }
  }