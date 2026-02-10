import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { PrismaClient } from "@prisma/client";
import { MercadoPagoConfig, Payment } from "mercadopago";

// Padrão Singleton do Prisma
const globalForPrisma = global as unknown as { prisma: PrismaClient };
const prisma = globalForPrisma.prisma || new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

// --- BUSCAR AGENDAMENTOS (GET) ---
// Mantido EXATAMENTE como você mandou, pois estava funcionando
// --- BUSCAR AGENDAMENTOS (GET) ---
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const bookingId = searchParams.get("bookingId"); 

    // 🔒 MODO PÚBLICO (BLINDADO)
    // Usado pelo modal para ver se o pagamento caiu
    if (bookingId) {
        const agendamento = await prisma.agendamento.findUnique({
            where: { id: bookingId },
            // 👇 AQUI ESTÁ A SEGURANÇA:
            // Selecionamos APENAS o status. Nenhum dado pessoal é exposto.
            select: { 
                status: true,
                id: true 
            } 
        });

        if (!agendamento) {
             // Retornamos 404 discreto
             return NextResponse.json({ error: "N/A" }, { status: 404 });
        }
        
        return NextResponse.json(agendamento);
    }

    // 🔐 MODO ADMIN (RESTRIÇÃO TOTAL)
    // A partir daqui, só passa se for o DONO logado
    const cookieStore = await cookies();
    const token = cookieStore.get("admin_session");

    if (!token || token.value !== "true") {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const establishmentId = searchParams.get("establishmentId");

    if (!establishmentId) {
      return NextResponse.json({ error: "ID da loja obrigatório" }, { status: 400 });
    }

    // ... (O resto do código de busca do Admin continua igual) ...
    
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
      createdAt: item.createdAt
    }));

    return NextResponse.json(bookings);
    
  } catch (error) {
    console.error("Erro ao buscar:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

// --- DELETAR AGENDAMENTO (DELETE) ---
// Mantido EXATAMENTE como você mandou
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
    console.error("Erro ao deletar:", error);
    return NextResponse.json({ error: "Erro ao deletar" }, { status: 500 });
  }
}

// =================================================================
// 👇 AQUI ESTÁ A CORREÇÃO BLINDADA (POST)
// =================================================================
export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // Pega o nome de qualquer jeito (name ou clientName)
    const nomeFinal = body.name || body.clientName;
    const telefoneFinal = body.phone || body.clientPhone;

    const { date, time, serviceName, price, establishmentId, paymentType } = body;

    // --- VALIDAÇÃO ---
    if (!nomeFinal || !price) {
        return NextResponse.json({ error: "Dados incompletos" }, { status: 400 });
    }

    // --- BUSCA TOKEN (Prioridade: Loja > .Env) ---
    let tokenDaLoja = process.env.MP_ACCESS_TOKEN; 
    
    if (establishmentId) {
        const loja = await prisma.estabelecimento.findUnique({ where: { id: establishmentId } });
        if (loja && loja.mercadoPagoToken) {
            tokenDaLoja = loja.mercadoPagoToken;
        }
    }

    if (!tokenDaLoja) return NextResponse.json({ error: "Sem token de pagamento" }, { status: 400 });

    // --- CRIA PIX NO MERCADO PAGO ---
    const client = new MercadoPagoConfig({ accessToken: tokenDaLoja });
    const payment = new Payment(client);

    const valorCobrado = paymentType === 'DEPOSIT' ? (Number(price) * 0.20) : Number(price);

    // Link FIXO (Hardcoded) para garantir que funciona
    const webhookUrl = "https://tameika-semiexpansible-anthony.ngrok-free.dev/api/webhook";

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

    console.log("🎨 IMAGEM GERADA?", qrCodeBase64 ? "SIM, TEM CÓDIGO!" : "NÃO, VEIO VAZIO!");

    // --- SALVA NO BANCO ---
    const novoAgendamento = await prisma.agendamento.create({
      data: {
        cliente: nomeFinal,
        telefone: telefoneFinal,
        data: date, 
        horario: time,
        servico: serviceName,
        valor: Number(valorCobrado),
        status: "PENDENTE",
        paymentId: String(paymentId),
        metodoPagamento: "PIX",
        establishmentId: establishmentId || null, 
      },
    });

    // --- RETORNO BLINDADO (Envia todos os nomes possíveis) ---

    const imagemPronta = `data:image/png;base64,${qrCodeBase64}`;
    return NextResponse.json({ 
        success: true, 
        bookingId: novoAgendamento.id,
        
        // 1. Variações CamelCase (Padrão moderno)
        qrCode: qrCodeBase64,
        qrCodeBase64: qrCodeBase64,
        image: qrCodeBase64,
        base64: qrCodeBase64,
        
        // 2. Variações Snake_Case (Padrão antigo/Python/PHP)
        qr_code: qrCodeBase64,
        qr_code_base64: qrCodeBase64,
        
        // 3. Variações Prontas para HTML (Com prefixo data:image)
        fullImage: imagemPronta,
        qrcodeUrl: imagemPronta,
        url: imagemPronta,
        
        // 4. Copia e Cola (Texto)
        copiaCola: qrCodeCopiaCola,
        pixCode: qrCodeCopiaCola,
        payload: qrCodeCopiaCola,
        
        // 5. Envia também o ID do pagamento caso o front precise
        paymentId: paymentId
    });

  } catch (error: any) {
    console.error("ERRO CRÍTICO:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}