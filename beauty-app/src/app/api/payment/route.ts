import { NextResponse } from 'next/server';
import { MercadoPagoConfig, Payment, Preference } from 'mercadopago'; 
import { PrismaClient } from '@prisma/client';

const globalForPrisma = global as unknown as { prisma: PrismaClient };
const prisma = globalForPrisma.prisma || new PrismaClient();
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

const client = new MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN! });

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    const { 
      title, serviceName, 
      date, time, clientName, clientPhone, 
      method, paymentType, 
      price, 
      isAdmin 
    } = body;

    const nomeRealDoServico = title || serviceName || "Serviço";

    // --- 1. BUSCA A REGRA DO SEU PAINEL ADMIN ---
    // O sistema vai no banco buscar a configuração atual
    const businessConfig = await prisma.configuracao.findFirst();
    
    // Pega a porcentagem do banco. Se não tiver nada salvo, usa 30 como segurança.
    const percentualSinal = businessConfig?.porcentagemSinal || 30; 
    
    console.log(`💳 Calculando pagamento. Regra do Painel: ${percentualSinal}%`);

    // --- 2. PREPARAÇÃO DO VALOR ---
    const valorOriginalServico = price ? Number(price) : 0; 
    let valorFinalParaCobranca = 0;
    let textoDiferenca = "";

    // --- 3. CÁLCULO MATEMÁTICO DINÂMICO ---
    if (paymentType === 'DEPOSIT') {
      // Regra de 3 simples: (Preço * Porcentagem) / 100
      valorFinalParaCobranca = Number((valorOriginalServico * (percentualSinal / 100)).toFixed(2));
      
      const valorRestante = valorOriginalServico - valorFinalParaCobranca;
      const restanteFormatado = valorRestante.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
      
      textoDiferenca = `(Sinal de ${percentualSinal}% (PAGO) | Restante: ${restanteFormatado} no local)`;
    } else {
      // Valor Integral (100%)
      valorFinalParaCobranca = valorOriginalServico;
      textoDiferenca = `(Integral)`;
    }

    // --- 4. PROTEÇÃO TÉCNICA (EVITAR ERRO DE API) ---
    // Só alteramos se o valor for ZERO ou NEGATIVO (o que daria erro no Mercado Pago)
    if (valorFinalParaCobranca <= 0) {
        valorFinalParaCobranca = 0.01; 
    }

    const nomeClienteLimpo = clientName.trim().split(' ').map((p: string) => p.charAt(0).toUpperCase() + p.slice(1)).join(' ');
    
    let nomeServicoFinal = isAdmin 
        ? `🚫 BLOQUEIO: ${nomeRealDoServico}` 
        : `${nomeRealDoServico} ${textoDiferenca}`;

    // --- 5. VALIDAÇÃO (NÃO PERMITE DUPLICIDADE) ---
    if (!isAdmin) {
        const conflito = await prisma.agendamento.findFirst({
            where: { data: date, horario: time, status: { not: 'CANCELADO' } }
        });
        
        if (conflito) {
            // Se já está pago ou confirmado, bloqueia
            if (conflito.status === 'CONFIRMADO' || conflito.status === 'PAGO') {
                return NextResponse.json({ error: 'Horário já reservado.' }, { status: 409 });
            }
            // Limpeza de agendamentos abandonados (mais de 2min)
            const doisMinutosAtras = new Date(Date.now() - 2 * 60 * 1000);
            if (conflito.status === 'PENDENTE' && new Date(conflito.createdAt) < doisMinutosAtras) {
                await prisma.agendamento.delete({ where: { id: conflito.id } }).catch(()=>{});
            } else {
                 return NextResponse.json({ error: 'Processando reserva neste horário.' }, { status: 409 });
            }
        }
    }

    // --- 6. CRIAÇÃO DO AGENDAMENTO ---
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
        paymentId: "PENDING"
      }
    });

    if (isAdmin) return NextResponse.json({ success: true });

    const BASE_URL = "https://teste-drab-rho-60.vercel.app"; // Seu domínio

    // --- 7. GERAÇÃO DO PIX / LINK ---
    if (method === 'PIX') {
        const payment = new Payment(client);
        
        const pixRequest = await payment.create({
            body: {
                transaction_amount: valorFinalParaCobranca,
                description: nomeServicoFinal,
                payment_method_id: 'pix',
                payer: {
                    email: "cliente@barbearia.com",
                    first_name: nomeClienteLimpo.split(' ')[0],
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