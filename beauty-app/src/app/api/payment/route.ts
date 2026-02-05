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
      price, // <--- NOVO: Agora estamos LENDO o preço que vem do site
      isAdmin 
    } = body;

    // Define o nome real do serviço
    const nomeRealDoServico = title || serviceName || "Serviço";

    // --- 1. CONFIGURAÇÕES E CÁLCULO FINANCEIRO ---
    const businessConfig = await prisma.configuracao.findFirst();
    const percentualSinal = businessConfig?.porcentagemSinal || 50; // Padrão 50% se não tiver config
    
    // Converte o preço recebido para número (Ex: "30.00" vira 30.00)
    // Se por acaso o preço não vier, usa 1.00 de segurança
    const valorOriginalServico = price ? Number(price) : 1.0; 
    
    let valorFinalParaCobranca = 0;
    let textoDiferenca = "";

    // LÓGICA DO SINAL vs INTEGRAL
    if (paymentType === 'DEPOSIT') {
      // Calcula X% do valor total
      valorFinalParaCobranca = Number((valorOriginalServico * (percentualSinal / 100)).toFixed(2));
      
      // Calcula quanto falta pagar na hora
      const valorRestante = valorOriginalServico - valorFinalParaCobranca;
      const restanteFormatado = valorRestante.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
      
      textoDiferenca = `(Sinal Pago | Restante: ${restanteFormatado} no local)`;
    } else {
      // Valor cheio
      valorFinalParaCobranca = valorOriginalServico;
      textoDiferenca = `(Integral)`;
    }

    // Trava de segurança do Mercado Pago (Mínimo R$ 0.01, mas recomendamos 1.00 para evitar erros)
    if (valorFinalParaCobranca < 0.10) valorFinalParaCobranca = 1.00;

    // Limpa o nome do cliente
    const nomeClienteLimpo = clientName.trim().split(' ').map((p: string) => p.charAt(0).toUpperCase() + p.slice(1)).join(' ');
    
    // Monta o nome final para o comprovante
    let nomeServicoFinal = isAdmin 
        ? `🚫 BLOQUEIO: ${nomeRealDoServico}` 
        : `${nomeRealDoServico} ${textoDiferenca}`;

    // --- 2. VALIDAÇÃO DE DISPONIBILIDADE ---
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

    // --- 3. CRIA O AGENDAMENTO NO BANCO ---
    const agendamento = await prisma.agendamento.create({
      data: { 
        cliente: nomeClienteLimpo, 
        telefone: clientPhone, 
        servico: nomeServicoFinal, 
        data: date, 
        horario: time, 
        valor: valorFinalParaCobranca, // Salva o valor exato que será cobrado no Pix
        status: isAdmin ? "CONFIRMADO" : "PENDENTE", 
        metodoPagamento: method,
        paymentId: "PENDING"
      }
    });

    if (isAdmin) return NextResponse.json({ success: true });

    const BASE_URL = "https://teste-drab-rho-60.vercel.app"; 
    const emailPadrao = "cliente@barbearia.com"; 

    // ============================================================
    // PAGAMENTO
    // ============================================================
    
    if (method === 'PIX') {
        const payment = new Payment(client);
        
        const pixRequest = await payment.create({
            body: {
                transaction_amount: valorFinalParaCobranca, // <--- Valor Calculado (Sinal ou Total)
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