import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { PrismaClient } from "@prisma/client";
import { MercadoPagoConfig, Payment } from "mercadopago";
import https from "https"; // Necessário para o Banco Inter (MTLS)
import crypto from "crypto";

// Padrão Singleton do Prisma
const globalForPrisma = global as unknown as { prisma: PrismaClient };
const prisma = globalForPrisma.prisma || new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

// --- TIPOS DE RESPOSTA PADRONIZADA ---
interface PaymentResponse {
  paymentId: string;
  qrCodeBase64: string; // Imagem
  qrCodeCopiaCola: string; // Texto
}

// =================================================================
// 1. CRIAR AGENDAMENTO E GERAR PIX (POST MULTI-BANCOS)
// =================================================================
export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // Normalização de dados
    const nomeFinal = body.name || body.clientName;
    const telefoneFinal = body.phone || body.clientPhone || "11999999999";
    const { date, time, serviceName, price, establishmentId, paymentType, slug } = body;

    // --- VALIDAÇÃO BÁSICA ---
    if (!nomeFinal || !price || (!establishmentId && !slug)) {
        return NextResponse.json({ error: "Dados incompletos" }, { status: 400 });
    }

    // --- BUSCA DADOS DA LOJA E PROVEDOR ---
    let loja = await prisma.estabelecimento.findFirst({
        where: { OR: [{ id: establishmentId }, { slug: slug }] }
    });

    if (!loja) return NextResponse.json({ error: "Loja não encontrada" }, { status: 404 });

    // Define qual provedor usar (Padrão: Mercado Pago)
    const provedor = loja.provedor || "MERCADOPAGO";
    
    // Calcula valor (Sinal ou Integral)
    const valorCobrado = paymentType === 'DEPOSIT' ? (Number(price) * (loja.porcentagemSinal / 100)) : Number(price);

    // Variáveis de resposta
    let dadosPagamento: PaymentResponse = { paymentId: "", qrCodeBase64: "", qrCodeCopiaCola: "" };

    // =================================================================
    // 🏦 MOTOR DE PAGAMENTOS (SWITCH)
    // =================================================================
    
    switch (provedor) {
        
        // -------------------------------------------------------------
        // 🔵 CASO 1: ASAAS (O "Salva-Vidas")
        // -------------------------------------------------------------
        case "ASAAS":
            if (!loja.asaasToken) throw new Error("Token do Asaas não configurado nesta loja.");
            
            // 1. Criar/Buscar Cliente no Asaas
            const asaasHeaders = { 
                "access_token": loja.asaasToken, 
                "Content-Type": "application/json" 
            };

            // Tenta criar o cliente primeiro
            const customerRes = await fetch("https://api.asaas.com/v3/customers", {
                method: "POST",
                headers: asaasHeaders,
                body: JSON.stringify({ name: nomeFinal, cpfCnpj: "00000000000" }) // CPF genérico se não tiver
            });
            const customerData = await customerRes.json();
            const customerId = customerData.id;

            // 2. Gerar Cobrança Pix
            const asaasPayRes = await fetch("https://api.asaas.com/v3/payments", {
                method: "POST",
                headers: asaasHeaders,
                body: JSON.stringify({
                    customer: customerId,
                    billingType: "PIX",
                    value: valorCobrado,
                    dueDate: new Date().toISOString().split('T')[0], // Vence hoje
                    description: `${serviceName} - ${time}`
                })
            });
            const asaasPayData = await asaasPayRes.json();
            
            if (asaasPayData.errors) throw new Error(asaasPayData.errors[0].description);
            
            // 3. Pegar o QR Code (Asaas exige uma chamada extra)
            const qrRes = await fetch(`https://api.asaas.com/v3/payments/${asaasPayData.id}/pixQrCode`, {
                method: "GET",
                headers: asaasHeaders
            });
            const qrData = await qrRes.json();

            dadosPagamento = {
                paymentId: asaasPayData.id,
                qrCodeBase64: qrData.encodedImage ? `data:image/png;base64,${qrData.encodedImage}` : "",
                qrCodeCopiaCola: qrData.payload
            };
            break;

        // -------------------------------------------------------------
        // 🟠 CASO 2: BANCO INTER (Pix Grátis)
        // -------------------------------------------------------------
        case "INTER":
            if (!loja.interCert || !loja.interKey || !loja.interClientId || !loja.interClientSecret) {
                throw new Error("Certificados do Banco Inter incompletos.");
            }

            // Configura o Agente HTTPS com os Certificados do Banco
            const agent = new https.Agent({
                cert: loja.interCert,
                key: loja.interKey,
                passphrase: "" // Geralmente vazio, mas pode ser configurável
            });

            // 1. Obter Token OAuth (O Inter exige isso a cada transação)
            const tokenResponse = await fetch("https://cdpj.partners.bancointer.com.br/oauth/v2/token", {
                method: "POST",
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded"
                },
                body: new URLSearchParams({
                    client_id: loja.interClientId,
                    client_secret: loja.interClientSecret,
                    scope: "pix.write pix.read",
                    grant_type: "client_credentials"
                }),
                // @ts-ignore - NextJS fetch tem suporte limitado a agent, mas em Node puro funciona.
                // Se der erro no Vercel, precisaremos usar 'axios' ou 'node-fetch' puro.
                agent: agent 
            } as any);
            
            const tokenData = await tokenResponse.json();
            if (!tokenData.access_token) throw new Error("Erro ao autenticar no Inter.");

            // 2. Criar Cobrança Imediata
            const txid = crypto.randomBytes(16).toString("hex"); // Gera um ID único
            const interCobRes = await fetch("https://cdpj.partners.bancointer.com.br/pix/v2/cob", {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${tokenData.access_token}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    calendario: { expiracao: 3600 },
                    devedor: { nome: nomeFinal, cpf: "00000000000" }, // CPF genérico
                    valor: { original: valorCobrado.toFixed(2) },
                    chave: "SUA_CHAVE_PIX_AQUI", // ⚠️ O INTER V2 USA A CHAVE CADASTRADA NA CONTA, ELE DESCOBRE AUTOMÁTICO SE OMITIR? NÃO.
                    // No Inter, a chave precisa ser passada ou ele usa a padrão. 
                    // SIMPLIFICAÇÃO: Vamos assumir que a chave principal é o CNPJ ou a aleatória.
                    // Para evitar erro agora, vamos pular a criação real se não tivermos a chave Pix no banco.
                    // OBS: O Inter exige a chave Pix no body. Vamos ter que adicionar isso no futuro.
                }),
                agent: agent
            } as any);

            // ⚠️ NOTA: A integração Inter é complexa. Se falhar o Agent no Vercel, 
            // recomendo fortemente usar o Asaas primeiro.
            // Vou colocar um "Mock" de erro aqui para te avisar.
            throw new Error("Banco Inter requer configuração avançada de Chave Pix. Use Asaas por enquanto.");
            break;

        // -------------------------------------------------------------
        // 🟡 CASO 3: PAGBANK (A Amarelinha)
        // -------------------------------------------------------------
        case "PAGBANK":
            if (!loja.pagbankToken) throw new Error("Token PagBank não configurado.");

            const pagRes = await fetch("https://api.pagseguro.com/orders", {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${loja.pagbankToken}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    reference_id: `booking-${Date.now()}`,
                    customer: {
                        name: nomeFinal,
                        email: "cliente@exemplo.com",
                        tax_id: "12345678909", // CPF Genérico válido para teste
                        phones: [{ country: "55", area: "11", number: "999999999", type: "MOBILE" }]
                    },
                    items: [{
                        name: serviceName,
                        quantity: 1,
                        unit_amount: Math.round(valorCobrado * 100) // Em centavos
                    }],
                    qr_codes: [{ amount: { value: Math.round(valorCobrado * 100) } }]
                })
            });
            const pagData = await pagRes.json();
            
            if (pagData.error_messages) throw new Error(pagData.error_messages[0].description);

            const qrCodePag = pagData.qr_codes?.[0];
            dadosPagamento = {
                paymentId: pagData.id,
                qrCodeBase64: qrCodePag.links.find((l:any) => l.rel === "QRCODE.PNG").href, // PagBank manda link
                qrCodeCopiaCola: qrCodePag.text
            };
            break;

        // -------------------------------------------------------------
        // 🔵 CASO PADRÃO: MERCADO PAGO
        // -------------------------------------------------------------
        default: 
            const mpToken = loja.mercadoPagoToken || process.env.MP_ACCESS_TOKEN;
            if (!mpToken) throw new Error("Token Mercado Pago ausente.");

            const client = new MercadoPagoConfig({ accessToken: mpToken });
            const payment = new Payment(client);

            // Webhook (Notificações)
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

            dadosPagamento = {
                paymentId: String(mpResponse.id),
                qrCodeBase64: `data:image/png;base64,${mpResponse.point_of_interaction?.transaction_data?.qr_code_base64}`,
                qrCodeCopiaCola: mpResponse.point_of_interaction?.transaction_data?.qr_code || ""
            };
            break;
    }

    // =================================================================
    // ✅ FINALIZAÇÃO: SALVA NO BANCO DE DADOS
    // =================================================================

    const novoAgendamento = await prisma.agendamento.create({
      data: {
        cliente: nomeFinal,
        telefone: telefoneFinal,
        data: date, 
        horario: time,
        servico: serviceName,
        valor: valorCobrado, 
        status: "PENDENTE",
        paymentId: String(dadosPagamento.paymentId),
        metodoPagamento: "PIX",
        establishmentId: loja.id,
      },
    });

    // --- RETORNO PADRONIZADO PARA O FRONTEND ---
    return NextResponse.json({ 
        success: true, 
        bookingId: novoAgendamento.id,
        // Mandamos todos os formatos possíveis para garantir que a imagem apareça
        qrCode: dadosPagamento.qrCodeBase64,
        qrCodeBase64: dadosPagamento.qrCodeBase64,
        image: dadosPagamento.qrCodeBase64,
        base64: dadosPagamento.qrCodeBase64,
        fullImage: dadosPagamento.qrCodeBase64,
        copiaCola: dadosPagamento.qrCodeCopiaCola,
        pixCode: dadosPagamento.qrCodeCopiaCola,
        payload: dadosPagamento.qrCodeCopiaCola,
        paymentId: dadosPagamento.paymentId
    });

  } catch (error: any) {
    console.error("ERRO CRÍTICO NO PAGAMENTO:", error);
    // Retorna erro amigável para o frontend mostrar no toast
    return NextResponse.json({ error: error.message || "Erro ao processar pagamento." }, { status: 500 });
  }
}

// =================================================================
// 2. BUSCAR AGENDAMENTOS (GET)
// =================================================================
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const bookingId = searchParams.get("bookingId"); 

    // 🔓 MODO PÚBLICO
    if (bookingId) {
        const agendamento = await prisma.agendamento.findUnique({
            where: { id: bookingId },
            select: { status: true, id: true } 
        });
        if (!agendamento) return NextResponse.json({ error: "N/A" }, { status: 404 });
        return NextResponse.json(agendamento);
    }

    // 🔐 MODO ADMIN
    const cookieStore = await cookies();
    const token = cookieStore.get("admin_session");
    if (!token || token.value !== "true") return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

    let establishmentId = searchParams.get("establishmentId");
    const slug = searchParams.get("slug");

    if (!establishmentId && slug) {
        const loja = await prisma.estabelecimento.findUnique({ where: { slug: slug }, select: { id: true } });
        if (loja) establishmentId = loja.id;
    }

    if (!establishmentId) return NextResponse.json({ error: "Loja não identificada" }, { status: 400 });

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
      priceTotal: Number(item.valor),
      createdAt: item.createdAt
    }));

    return NextResponse.json(bookings);
  } catch (error) {
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
    if (!token || token.value !== "true") return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

    const { id } = await request.json();
    await prisma.agendamento.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Erro ao deletar" }, { status: 500 });
  }
}

// =================================================================
// 4. CONFIRMAR PAGAMENTO (PATCH)
// =================================================================
export async function PATCH(request: Request) {
    try {
      const cookieStore = await cookies();
      const token = cookieStore.get("admin_session");
      if (!token || token.value !== "true") return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  
      const { id } = await request.json();
      const updated = await prisma.agendamento.update({ where: { id }, data: { status: 'PAGO' } });
      return NextResponse.json(updated);
    } catch (error) {
      return NextResponse.json({ error: "Erro ao atualizar" }, { status: 500 });
    }
}