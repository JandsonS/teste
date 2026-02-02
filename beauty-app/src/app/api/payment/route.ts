import { NextResponse } from 'next/server';
import { MercadoPagoConfig, Payment, Preference } from 'mercadopago'; 
import { PrismaClient } from '@prisma/client';

const globalForPrisma = global as unknown as { prisma: PrismaClient };
const prisma = globalForPrisma.prisma || new PrismaClient();
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

// Configure com seu TOKEN
const client = new MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN! });

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // --- 1. CORREÇÃO AQUI: Lemos tanto 'title' quanto 'serviceName' ---
    const { 
      title, serviceName, // <--- Adicionei serviceName aqui
      date, time, clientName, clientPhone, 
      method, paymentType, pricePending, 
      isAdmin 
    } = body;

    // --- 2. DEFINE O NOME REAL (Prioriza title, se não tiver usa serviceName) ---
    const nomeRealDoServico = title || serviceName || "Serviço";

    // --- CONFIGURAÇÕES E VALORES ---
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
    
    // --- 3. USA O NOME CORRIGIDO NA DESCRIÇÃO ---
    let nomeServicoFinal = isAdmin 
        ? `🚫 BLOQUEIO: ${nomeRealDoServico}` 
        : (paymentType === 'DEPOSIT' 
            ? `${nomeRealDoServico} (Sinal Pago | Restante: ${valorRestanteFormatado} no local)` 
            : `${nomeRealDoServico} (Integral)`);

    // --- VALIDAÇÃO (SE JÁ TEM AGENDAMENTO) ---
    if (!isAdmin) {
        const conflito = await prisma.agendamento.findFirst({
            where: { 
                data: date, horario: time, status: { not: 'CANCELADO' } 
            }
        });
        
        if (conflito) {
            if (conflito.status === 'CONFIRMADO' || conflito.status === 'PAGO') {
                return NextResponse.json({ error: 'Horário já reservado.' }, { status: 409 });
            }
            const doisMinutosAtras = new Date(Date.now() - 2 * 60 * 1000);
            if (conflito.status === 'PENDENTE' && new Date(conflito.createdAt) < doisMinutosAtras) {
                await prisma.agendamento.delete({ where: { id: conflito.id } }).catch(()=>{});
            } else {
                 return NextResponse.json({ error: 'Alguém está reservando este horário agora.' }, { status: 409 });
            }
        }
    }

    // --- CRIA O AGENDAMENTO NO BANCO ---
    const agendamento = await prisma.agendamento.create({
      data: { 
        cliente: nomeClienteLimpo, 
        telefone: clientPhone, 
        servico: nomeServicoFinal, // Agora vai salvar o nome certo!
        data: date, 
        horario: time, 
        valor: valorFinalParaCobranca,
        status: isAdmin ? "CONFIRMADO" : "PENDENTE", 
        metodoPagamento: method,
        paymentId: "PENDING"
      }
    });

    if (isAdmin) return NextResponse.json({ success: true });

    const BASE_URL = "https://teste-drab-rho-60.vercel.app"; // SEU SITE
    const emailPadrao = "cliente@barbearia.com"; 

    // ============================================================
    // PAGAMENTO
    // ============================================================
    
    if (method === 'PIX') {
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
                external_reference: agendamento.id,
                notification_url: `${BASE_URL}/api/webhook`
            }
        });

        await prisma.agendamento.update({
            where: { id: agendamento.id },
            data: { paymentId: String(pixRequest.id) } 
        });

        return NextResponse.json({
            id: String(pixRequest.id),
            qrCodeBase64: pixRequest.point_of_interaction?.transaction_data?.qr_code_base64,
            qrCodeCopyPaste: pixRequest.point_of_interaction?.transaction_data?.qr_code
        });

    } else {
        const preference = new Preference(client);
        const prefRequest = await preference.create({
            body: {
                // Usei nomeRealDoServico aqui também para garantir
                items: [{ id: agendamento.id, title: nomeRealDoServico, unit_price: valorFinalParaCobranca, quantity: 1 }],
                external_reference: agendamento.id,
                notification_url: `${BASE_URL}/api/webhook`,
                back_urls: { success: `${BASE_URL}/`, failure: `${BASE_URL}/` },
                auto_return: 'approved'
            }
        });

        return NextResponse.json({ url: prefRequest.init_point });
    }

  } catch (error) {
    console.error("Erro Pagamento:", error); 
    return NextResponse.json({ error: 'Erro ao processar pagamento.' }, { status: 500 });
  }
}