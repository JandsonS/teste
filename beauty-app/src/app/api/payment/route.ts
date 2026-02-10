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
      isAdmin,
      establishmentId // <--- ID da loja
    } = body;

    // 1. Validação de Segurança
    if (!establishmentId && !isAdmin) {
        return NextResponse.json({ error: 'Estabelecimento não identificado.' }, { status: 400 });
    }

    const nomeRealDoServico = title || serviceName || "Serviço";

    // --- CORREÇÃO 1: Usando 'estabelecimento' (nome da sua tabela) ---
    const estabelecimento = await prisma.estabelecimento.findUnique({
        where: { id: establishmentId }
    });

    if (!estabelecimento) {
        return NextResponse.json({ error: 'Barbearia não encontrada.' }, { status: 404 });
    }

    // Pega a porcentagem configurada na barbearia ou usa 30% como padrão
    const percentualSinal = estabelecimento.porcentagemSinal || 30; 
    
    console.log(`💳 Iniciando pagamento para: ${estabelecimento.nome} (Sinal: ${percentualSinal}%)`);

    // --- CÁLCULO DE VALORES ---
    const valorOriginalServico = price ? Number(price) : 0; 
    let valorFinalParaCobranca = 0;
    let textoDiferenca = "";

    if (paymentType === 'DEPOSIT') {
      valorFinalParaCobranca = Number((valorOriginalServico * (percentualSinal / 100)).toFixed(2));
      const valorRestante = valorOriginalServico - valorFinalParaCobranca;
      const restanteFormatado = valorRestante.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
      textoDiferenca = `(Sinal de ${percentualSinal}% | Restante: ${restanteFormatado} no local)`;
    } else {
      valorFinalParaCobranca = valorOriginalServico;
      textoDiferenca = `(Integral)`;
    }

    if (valorFinalParaCobranca <= 0) {
        valorFinalParaCobranca = 0.01; 
    }

    const nomeClienteLimpo = clientName.trim().split(' ').map((p: string) => p.charAt(0).toUpperCase() + p.slice(1)).join(' ');
    
    let nomeServicoFinal = isAdmin 
        ? `🚫 BLOQUEIO: ${nomeRealDoServico}` 
        : `${nomeRealDoServico} ${textoDiferenca}`;

    // --- VALIDAÇÃO DE CONFLITO ---
    if (!isAdmin) {
        // --- CORREÇÃO 2: Usando 'agendamento' e campos em português ---
        const conflito = await prisma.agendamento.findFirst({
            where: { 
                establishmentId: establishmentId, 
                data: date, 
                horario: time, 
                status: { not: 'CANCELADO' } 
            }
        });
        
        if (conflito) {
            if (conflito.status === 'CONFIRMADO' || conflito.status === 'PAGO' || conflito.status === 'PAGO_PIX') {
                return NextResponse.json({ error: 'Horário já reservado.' }, { status: 409 });
            }
            // Limpeza de pendentes antigos (2 min)
            const doisMinutosAtras = new Date(Date.now() - 2 * 60 * 1000);
            if (conflito.status === 'PENDENTE' && new Date(conflito.createdAt) < doisMinutosAtras) {
                await prisma.agendamento.delete({ where: { id: conflito.id } }).catch(()=>{});
            } else {
                 return NextResponse.json({ error: 'Processando reserva neste horário.' }, { status: 409 });
            }
        }
    }

    // --- CRIAÇÃO DO AGENDAMENTO (Campos em Português) ---
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
        paymentId: "PENDING",
        establishmentId: establishmentId // Vincula à loja correta
      }
    });

    if (isAdmin) return NextResponse.json({ success: true });

    const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"; 

    // --- MERCADO PAGO ---
    if (method === 'PIX') {
        const payment = new Payment(client);
        
        const pixRequest = await payment.create({
            body: {
    transaction_amount: valorFinalParaCobranca,
    description: nomeServicoFinal,
    payment_method_id: 'pix',
    payer: {
                email: "cliente@teste.com",
                first_name: nomeClienteLimpo.split(' ')[0],
                identification: { type: "CPF", number: "19119119100" }
            },
            external_reference: agendamento.id,
            
            // 👇 A MUDANÇA É SÓ AQUI 👇
            // O Mercado Pago obriga ser um site https:// real. 
            // Vamos usar o google só para ele parar de reclamar e gerar o QR Code.
            notification_url: "https://www.google.com" 
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
        return NextResponse.json({ error: "Método não implementado neste teste" });
    }

  } catch (error) {
    console.error("Erro Pagamento:", error); 
    return NextResponse.json({ error: 'Erro ao processar pagamento.' }, { status: 500 });
  }
}