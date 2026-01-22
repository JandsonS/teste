import { NextResponse } from "next/server";
import { MercadoPagoConfig, Preference } from "mercadopago";
import { prisma } from "@/lib/prisma";

// Configura o Mercado Pago
const client = new MercadoPagoConfig({
  accessToken: process.env.MP_ACCESS_TOKEN!,
});

// URL Base (Ajuste para seu domínio de produção na Vercel quando subir)
// Ex: const BASE_URL = "https://sua-barbearia.vercel.app";
const BASE_URL = "http://localhost:3000"; // Mude isso quando for para o ar!

export async function POST(req: Request) {
  try {
    const { 
      title, 
      date, 
      time, 
      price, 
      clientName, 
      clientPhone, 
      method,
      paymentType,   
      priceTotal,    
      pricePaid,     
      pricePending   
    } = await req.json();

    // 1. VERIFICAÇÃO DE SEGURANÇA (A Vaga ainda está livre?)
    // Aqui também ignoramos os CANCELADOS
    const existingBooking = await prisma.agendamento.findFirst({
      where: {
        data: date,
        horario: time,
        status: {
          not: "CANCELADO" // <--- SE TIVER UM CANCELADO, ELE LIBERA A VAGA
        }
      },
    });

    if (existingBooking) {
      return NextResponse.json(
        { error: "Este horário acabou de ser reservado por outra pessoa." },
        { status: 409 }
      );
    }

    // 2. Cria o registro no Banco de Dados como PENDENTE
    // Monta o nome do serviço com a info financeira
    let serviceLabel = title;
    if (paymentType === 'DEPOSIT') {
       serviceLabel = `${title} (Sinal Pago | Resta: ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(pricePending)})`;
    }

    const newBooking = await prisma.agendamento.create({
      data: {
        data: date,
        horario: time,
        cliente: clientName,
        telefone: clientPhone,
        servico: serviceLabel,
        valor: parseFloat(pricePaid), // Salva o valor que foi pago agora
        metodoPagamento: method,
        status: "PENDENTE",
      },
    });

    // 3. Gera o Link de Pagamento no Mercado Pago
    const preference = new Preference(client);
    
    // Calcula data de vencimento (15 minutos para pagar)
    const expirationDate = new Date();
    expirationDate.setMinutes(expirationDate.getMinutes() + 15);

    const result = await preference.create({
      body: {
        items: [
          {
            id: newBooking.id,
            title: serviceLabel,
            quantity: 1,
            unit_price: Number(pricePaid), // Cobra apenas o que foi combinado (Total ou Sinal)
          },
        ],
        payer: {
          name: clientName,
          // O Mercado Pago pede email, usamos um fictício se não tiver
          email: "cliente@barbearia.com", 
        },
        payment_methods: {
           excluded_payment_types: [
             { id: "ticket" } // Remove boleto (demora a compensar)
           ],
           installments: 1 // Bloqueia parcelamento se quiser
        },
        back_urls: {
          success: `${BASE_URL}/sucesso?id=${newBooking.id}`,
          failure: `${BASE_URL}/?status=failure`,
          pending: `${BASE_URL}/?status=pending`,
        },
        auto_return: "approved",
        external_reference: newBooking.id, // VITAL: Liga o pagamento ao agendamento
        date_of_expiration: expirationDate.toISOString(),
      },
    });

    return NextResponse.json({ url: result.init_point });

  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Erro ao processar pagamento" },
      { status: 500 }
    );
  }
}