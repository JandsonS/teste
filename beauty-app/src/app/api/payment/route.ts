import { NextResponse } from 'next/server';
import { MercadoPagoConfig, Payment } from 'mercadopago'; // <--- Trocamos Preference por Payment
import { PrismaClient } from '@prisma/client';
import { SITE_CONFIG } from "@/constants/info"; 

// Singleton do Prisma
const globalForPrisma = global as unknown as { prisma: PrismaClient };
const prisma = globalForPrisma.prisma || new PrismaClient();
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

const client = new MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN! });

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // Adaptamos para receber os nomes que o seu Frontend (Modal) envia
    // O modal envia: { serviceName, price, clientName, clientWhatsapp }
    // Mas seu código antigo esperava: { title, date, time, ... }
    // Vamos padronizar para usar o que o MODAL envia agora.
    
    const { 
      serviceName, price, clientName, clientWhatsapp,
      // Se você ainda quiser mandar date/time pelo modal, precisa adicionar lá no fetch
      // Por enquanto, vamos assumir que o modal manda tudo ou vamos simplificar para o Pix
      date, time, method 
    } = body;

    // --- IMPORTANTE: LÓGICA DE VALIDAÇÃO ---
    // Como estamos mudando para Pix Direto no Modal, a validação de horário
    // deve acontecer ANTES de abrir o modal (no botão de agendar).
    // Mas se quiser manter aqui, precisamos garantir que o modal envie 'date' e 'time'.
    
    // Vou simplificar para focar NO PIX, que é o objetivo agora.
    // A validação de horário complexa (2 minutos) pode ser movida para uma rota de "/check-availability" depois.
    
    // 1. Limpa o valor (R$ 30,00 -> 30.00)
    const cleanPrice = typeof price === 'string' 
      ? parseFloat(price.replace("R$", "").replace(/\./g, "").replace(",", ".").trim())
      : Number(price);

    // 2. Limpeza de Nome
    const nomeClienteLimpo = clientName
        .trim()
        .toLowerCase()
        .split(' ')
        .map((palavra: string) => palavra.charAt(0).toUpperCase() + palavra.slice(1))
        .join(' ');

    // 3. Cria o Pagamento Pix Direto (TRANSPARENTE)
    const payment = new Payment(client);
    
    // O Mercado Pago exige um e-mail. Usamos um genérico se não tiver.
    const payerEmail = "cliente@beautyapp.com"; 

    // URL do seu site (para o webhook avisar quando pagar)
    // Se estiver em localhost, o webhook não funciona (precisa de túnel ou deploy)
    // Mas o QR Code gera mesmo assim.
    const notificationUrl = "https://teste-drab-rho-60.vercel.app/"; 

    const paymentResponse = await payment.create({
      body: {
        transaction_amount: cleanPrice,
        description: serviceName || "Serviço de Beleza",
        payment_method_id: 'pix',
        payer: {
          email: payerEmail,
          first_name: nomeClienteLimpo
        },
        notification_url: notificationUrl,
      }
    });

    // 4. Pega os dados do Pix
    const pointOfInteraction = paymentResponse.point_of_interaction;
    const qrCodeBase64 = pointOfInteraction?.transaction_data?.qr_code_base64;
    const qrCodeCopyPaste = pointOfInteraction?.transaction_data?.qr_code;
    const paymentId = paymentResponse.id;

    // 5. (Opcional) Salvar "Pré-Agendamento" no Banco
    // Se você quiser reservar o horário assim que gerar o Pix:
    if (date && time) {
        await prisma.agendamento.create({
            data: {
                cliente: nomeClienteLimpo,
                telefone: clientWhatsapp,
                servico: serviceName,
                data: date,       // Precisa vir do modal
                horario: time,    // Precisa vir do modal
                valor: cleanPrice,
                status: "PENDENTE", // Fica pendente até o Webhook confirmar
                metodoPagamento: "PIX",
                paymentId: String(paymentId) // Guarda o ID para o Webhook achar depois
            }
        });
    }

    // Retorna os dados para o Modal exibir
    return NextResponse.json({
      qrCodeBase64,
      qrCodeCopyPaste,
      paymentId
    });

  } catch (error) {
    console.error("Erro ao gerar Pix:", error);
    return NextResponse.json({ error: "Erro ao processar pagamento" }, { status: 500 });
  }
}