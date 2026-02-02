import { NextResponse } from 'next/server';
import { MercadoPagoConfig, Payment, Preference } from 'mercadopago'; // ADICIONEI PAYMENT
import { PrismaClient } from '@prisma/client';

const globalForPrisma = global as unknown as { prisma: PrismaClient };
const prisma = globalForPrisma.prisma || new PrismaClient();
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

// Configure com seu TOKEN
const client = new MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN! });

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { 
      title, date, time, clientName, clientPhone, 
      method, paymentType, pricePending, 
      isAdmin 
    } = body;

    // --- 1. CONFIGURAÇÕES E VALORES ---
    const businessConfig = await prisma.configuracao.findFirst();
    const percentualSinal = businessConfig?.porcentagemSinal || 50;
    const valorServicoTotal = 1.0; 
    
    // Calcula quanto vai cobrar AGORA
    const valorFinalParaCobranca = paymentType === 'DEPOSIT' 
      ? Number((valorServicoTotal * (percentualSinal / 100)).toFixed(2))
      : valorServicoTotal;

    const valorRestanteFormatado = Number(pricePending).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

    // Limpa o nome do cliente
    const nomeClienteLimpo = clientName.trim().split(' ').map((p: string) => p.charAt(0).toUpperCase() + p.slice(1)).join(' ');
    
    // Nome do serviço que vai aparecer
    let nomeServicoFinal = isAdmin 
        ? `🚫 BLOQUEIO: ${title}` 
        : (paymentType === 'DEPOSIT' 
            ? `${title} (Sinal Pago | Restante: ${valorRestanteFormatado} no local)` 
            : `${title} (Integral)`);

    // --- 2. VALIDAÇÃO (SE JÁ TEM AGENDAMENTO) ---
    if (!isAdmin) {
        // Verifica duplicidade no horário (Lógica mantida simplificada aqui)
        const conflito = await prisma.agendamento.findFirst({
            where: { 
                data: date, horario: time, status: { not: 'CANCELADO' } 
            }
        });
        
        if (conflito) {
            // Se já está pago/confirmado, bloqueia
            if (conflito.status === 'CONFIRMADO' || conflito.status === 'PAGO') {
                return NextResponse.json({ error: 'Horário já reservado.' }, { status: 409 });
            }
            // Se é um pendente antigo (> 2 min), remove para liberar a vaga
            const doisMinutosAtras = new Date(Date.now() - 2 * 60 * 1000);
            if (conflito.status === 'PENDENTE' && new Date(conflito.createdAt) < doisMinutosAtras) {
                await prisma.agendamento.delete({ where: { id: conflito.id } }).catch(()=>{});
            } else {
                 return NextResponse.json({ error: 'Alguém está reservando este horário agora.' }, { status: 409 });
            }
        }
    }

    // --- 3. CRIA O AGENDAMENTO NO BANCO (STATUS PENDENTE) ---
    // Criamos PRIMEIRO no banco para ter o ID interno
    const agendamento = await prisma.agendamento.create({
      data: { 
        cliente: nomeClienteLimpo, 
        telefone: clientPhone, 
        servico: nomeServicoFinal, 
        data: date, 
        horario: time, 
        valor: valorFinalParaCobranca,
        status: isAdmin ? "CONFIRMADO" : "PENDENTE", 
        metodoPagamento: method,
        paymentId: "PENDING" // Vamos atualizar isso já já
      }
    });

    if (isAdmin) return NextResponse.json({ success: true });

    const BASE_URL = "https://teste-drab-rho-60.vercel.app"; // SEU SITE
    const emailPadrao = "cliente@barbearia.com"; // Email genérico pois o MP exige

    // ============================================================
    // A MÁGICA: DECIDE SE É PIX (TRANSPARENTE) OU CARTÃO (LINK)
    // ============================================================
    
    if (method === 'PIX') {
        // --- MODO PIX (Fica no site) ---
        const payment = new Payment(client);
        
        const pixRequest = await payment.create({
            body: {
                transaction_amount: valorFinalParaCobranca,
                description: nomeServicoFinal,
                payment_method_id: 'pix',
                payer: {
                    email: emailPadrao,
                    first_name: nomeClienteLimpo.split(' ')[0],
                    last_name: nomeClienteLimpo.split(' ').slice(1).join(' ') || 'Cliente',
                },
                external_reference: agendamento.id, // Liga o Pix ao seu Banco
                notification_url: `${BASE_URL}/api/webhook`
            }
        });

        // ⚠️ IMPORTANTE: Atualiza o agendamento com o ID do Mercado Pago
        // Isso permite que o "Espião" e o Webhook encontrem esse agendamento!
        await prisma.agendamento.update({
            where: { id: agendamento.id },
            data: { paymentId: String(pixRequest.id) } 
        });

        // Retorna os dados para o Modal mostrar o QR Code
        return NextResponse.json({
            id: String(pixRequest.id), // ID para o Espião
            qrCodeBase64: pixRequest.point_of_interaction?.transaction_data?.qr_code_base64,
            qrCodeCopyPaste: pixRequest.point_of_interaction?.transaction_data?.qr_code
        });

    } else {
        // --- MODO CARTÃO (Gera Link) ---
        const preference = new Preference(client);
        const prefRequest = await preference.create({
            body: {
                items: [{ id: agendamento.id, title: title, unit_price: valorFinalParaCobranca, quantity: 1 }],
                external_reference: agendamento.id,
                notification_url: `${BASE_URL}/api/webhook`,
                back_urls: { success: `${BASE_URL}/`, failure: `${BASE_URL}/` },
                auto_return: 'approved'
            }
        });

        // No modo Link, não temos o ID do pagamento ainda, só quando a pessoa pagar.
        return NextResponse.json({ url: prefRequest.init_point });
    }

  } catch (error) {
    console.error("Erro Pagamento:", error); 
    return NextResponse.json({ error: 'Erro ao processar pagamento.' }, { status: 500 });
  }
}