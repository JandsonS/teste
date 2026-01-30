import { NextResponse } from 'next/server';
import { MercadoPagoConfig, Preference } from 'mercadopago';
import { PrismaClient } from '@prisma/client';
import webPush from "web-push"; // Mantido para não quebrar imports
import { SITE_CONFIG } from "@/constants/info"; // Mantido seu import original

// Singleton do Prisma
const globalForPrisma = global as unknown as { prisma: PrismaClient };
const prisma = globalForPrisma.prisma || new PrismaClient();
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

const client = new MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN! });

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { 
      title, date, time, clientName, clientPhone, 
      method, paymentType, pricePaid, pricePending, 
      isAdmin 
    } = body;

    // --- CONFIGURAÇÕES DE NEGÓCIO (MANTIDAS) ---
    const businessConfig = await prisma.configuracao.findFirst();
    const percentualSinal = businessConfig?.porcentagemSinal || 50;
    const valorServicoTotal = 1.0; 
    const valorFinalParaCobranca = paymentType === 'DEPOSIT' 
      ? Number((valorServicoTotal * (percentualSinal / 100)).toFixed(2))
      : valorServicoTotal;

    const valorRestaNoLocal = valorServicoTotal - valorFinalParaCobranca;

    // --- LIMPEZA DE NOME ---
    const nomeClienteLimpo = clientName
        .trim()
        .toLowerCase()
        .split(' ')
        .map((palavra: string) => palavra.charAt(0).toUpperCase() + palavra.slice(1))
        .join(' ');
    
    const BASE_URL = "https://teste-drab-rho-60.vercel.app"; 
    
    // NOVO: Tempo limite de 2 minutos para considerar "Abandono de Carrinho"
    const tempoLimite = new Date(Date.now() - 2 * 60 * 1000);

    // =================================================================================
    // FASE DE VALIDAÇÃO (SÓ PARA CLIENTES)
    // =================================================================================
    if (!isAdmin) {
        
        // 1. Checagem de Duplicidade do Cliente (MANTIDA)
        const historicoCliente = await prisma.agendamento.findMany({ 
            where: { cliente: nomeClienteLimpo, status: { not: 'CANCELADO' } } 
        });

        for (const r of historicoCliente) {
            // Se já tem confirmado ou pago no dia
            if (r.status === 'CONFIRMADO' || r.status.includes('PAGO')) {
                if (r.data === date) {
                    return NextResponse.json({ 
                        error: `🚫 Olá ${nomeClienteLimpo.split(' ')[0]}, você já possui um agendamento confirmado para este dia.` 
                    }, { status: 409 });
                }
            }
            // Limpeza de pendentes antigos do próprio cliente
            if (r.status === 'PENDENTE') {
               if (new Date(r.createdAt) < tempoLimite) {
                  await prisma.agendamento.delete({ where: { id: r.id } }).catch(()=>{});
               }
            }
        }

        // 2. Checagem Inteligente de Vaga (ALTERADA PARA REGRA DE 2 MIN)
        const agendamentoExistente = await prisma.agendamento.findFirst({
            where: { 
                data: date, 
                horario: time, 
                status: { not: 'CANCELADO' } 
            }
        });

        if (agendamentoExistente) {
            // Se já pagou -> Bloqueia
            if (agendamentoExistente.status === 'CONFIRMADO' || agendamentoExistente.status.includes('PAGO')) {
                 return NextResponse.json({ error: 'Este horário já foi reservado por outra pessoa.' }, { status: 409 });
            }

            // Se for PENDENTE...
            if (agendamentoExistente.status === 'PENDENTE') {
                if (new Date(agendamentoExistente.createdAt) > tempoLimite) {
                    // ...e é RECENTE (< 2 min) -> Bloqueia com mensagem específica
                    return NextResponse.json({ 
                        error: '⚠️ Este horário está sendo reservado agora. Tente novamente em 2 minutos ou escolha outro.' 
                    }, { status: 409 });
                } else {
                    // ...e é VELHO (> 2 min) -> Exclui para liberar a vaga para você
                    await prisma.agendamento.delete({ where: { id: agendamentoExistente.id } });
                }
            }
        }
    }

    // =================================================================================
    // FASE DE CRIAÇÃO (ADMIN E CLIENTES)
    // =================================================================================
    
    // Formatação do valor restante (R$ 0,40)
    const valorRestanteFormatado = Number(pricePending).toLocaleString('pt-BR', { 
        style: 'currency', currency: 'BRL' 
    });

    let nomeServicoFinal = isAdmin 
        ? `🚫 BLOQUEIO: ${title}` 
        : (paymentType === 'DEPOSIT' 
            ? `${title} (Sinal Pago | Restante: ${valorRestanteFormatado} a pagar no local)` 
            : `${title} (Integral)`);
    
    const agendamento = await prisma.agendamento.create({
      data: { 
        cliente: nomeClienteLimpo, 
        telefone: clientPhone, 
        servico: nomeServicoFinal, 
        data: date, 
        horario: time, 
        valor: valorFinalParaCobranca,
        status: isAdmin ? "CONFIRMADO" : "PENDENTE", 
        metodoPagamento: method 
      }
    });

    // Se for Admin, finalizamos aqui.
    if (isAdmin) {
        return NextResponse.json({ success: true, message: "Bloqueio realizado com sucesso!" });
    }

    // *** NOTIFICAÇÃO PUSH REMOVIDA DAQUI ***
    // (Isso impede que o cliente receba "Confirmado" antes de pagar)

    // =================================================================================
    // FASE MERCADO PAGO
    // =================================================================================
    let excludedPaymentTypes: { id: string }[] = [];
    if (method === 'PIX') {
        excludedPaymentTypes = [{ id: "credit_card" }, { id: "debit_card" }, { id: "ticket" }, { id: "prepaid_card" }, { id: "atm" }];
    } else if (method === 'CARD') {
        excludedPaymentTypes = [{ id: "bank_transfer" }, { id: "ticket" }, { id: "atm" }, { id: "digital_currency"}];
    }

    const preference = new Preference(client);
    const result = await preference.create({
      body: {
        external_reference: agendamento.id,
        items: [{ id: agendamento.id, title: title, unit_price: valorFinalParaCobranca, quantity: 1 }],
        payer: { name: nomeClienteLimpo },
        payment_methods: {
          excluded_payment_types: excludedPaymentTypes,
          installments: 1
        },
        back_urls: { 
            success: `${BASE_URL}/sucesso?id=${agendamento.id}`, 
            failure: `${BASE_URL}/`, 
            pending: `${BASE_URL}/` 
        },
        auto_return: 'approved',
        notification_url: `${BASE_URL}/api/webhook`,
      },
    });

    return NextResponse.json({ url: result.init_point });
  } catch (error) {
    console.error(error); 
    return NextResponse.json({ error: 'Erro interno no servidor.' }, { status: 500 });
  }
}