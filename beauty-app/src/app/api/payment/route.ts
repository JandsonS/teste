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
    
    const { 
      title, serviceName, 
      date, time, clientName, clientPhone, 
      method, paymentType, 
      price, // <--- AGORA O SISTEMA LÊ O PREÇO QUE VEM DO FRONTEND
      isAdmin 
    } = body;

    // Define o nome real do serviço
    const nomeRealDoServico = title || serviceName || "Serviço";

    // --- 1. BUSCA CONFIGURAÇÕES (PORCENTAGEM DO SINAL) ---
    const businessConfig = await prisma.configuracao.findFirst();
    const percentualSinal = businessConfig?.porcentagemSinal || 30; // Se não tiver config, usa 30%
    
    // --- 2. CÁLCULO FINANCEIRO CORRETO ---
    // Converte o preço que veio (ex: "30.00") para número
    const valorOriginalServico = Number(price); 
    
    let valorFinalParaCobranca = 0;
    let textoDiferenca = "";

    if (paymentType === 'DEPOSIT') {
        // CÁLCULO DO SINAL: (Preço * Porcentagem) / 100
        // Ex: 50.00 * 0.20 = 10.00
        valorFinalParaCobranca = Number((valorOriginalServico * (percentualSinal / 100)).toFixed(2));
        
        // Calcula quanto sobra para pagar na hora
        const valorRestante = valorOriginalServico - valorFinalParaCobranca;
        const restanteFormatado = valorRestante.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
        
        textoDiferenca = `(Sinal Pago | Restante: ${restanteFormatado} no local)`;
    } else {
        // VALOR INTEGRAL
        valorFinalParaCobranca = valorOriginalServico;
        textoDiferenca = `(Valor Integral)`;
    }

    // Garante que não vai cobrar zero ou negativo (Segurança)
    if (valorFinalParaCobranca < 1) valorFinalParaCobranca = 1.00; // Mínimo do MP é aprox 1 real

    // Limpa o nome do cliente
    const nomeClienteLimpo = clientName.trim().split(' ').map((p: string) => p.charAt(0).toUpperCase() + p.slice(1)).join(' ');
    
    // Monta o nome final que vai aparecer no comprovante
    let nomeServicoFinal = isAdmin 
        ? `🚫 BLOQUEIO: ${nomeRealDoServico}` 
        : `${nomeRealDoServico} ${textoDiferenca}`;

    // --- 3. VALIDAÇÃO DE DISPONIBILIDADE ---
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
                 return NextResponse.json({ error: 'Processando reserva neste horário.' }, { status: 409 });
            }
        }
    }

    // --- 4. CRIA O AGENDAMENTO NO BANCO ---
    const agendamento = await prisma.agendamento.create({
      data: { 
        cliente: nomeClienteLimpo, 
        telefone: clientPhone, 
        servico: nomeServicoFinal, 
        data: date, 
        horario: time, 
        valor: valorFinalParaCobranca, // Salva o valor que foi COBRADO (Sinal ou Total)
        status: isAdmin ? "CONFIRMADO" : "PENDENTE", 
        metodoPagamento: method,
        paymentId: "PENDING"
      }
    });

    if (isAdmin) return NextResponse.json({ success: true });

    const BASE_URL = "https://teste-drab-rho-60.vercel.app"; // SEU SITE
    const emailPadrao = "cliente@barbearia.com"; 

    // --- 5. GERA O PIX OU LINK ---
    if (method === 'PIX') {
        const payment = new Payment(client);
        
        const pixRequest = await payment.create({
            body: {
                transaction_amount: valorFinalParaCobranca, // <--- Envia o valor calculado
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