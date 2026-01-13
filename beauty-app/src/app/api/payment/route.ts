import { NextResponse } from 'next/server';
import { MercadoPagoConfig, Preference } from 'mercadopago';

// ATENÇÃO: Nunca coloque seu Access Token real aqui no código se for subir pro GitHub público!
// O ideal é usar variáveis de ambiente (.env), mas para testar agora, vamos colocar direto.
const client = new MercadoPagoConfig({ accessToken: 'APP_USR-2631852624760187-011208-2bcdccd1576b285ad2046970b25ac1cb-3127805685' });

export async function POST(request: Request) {
  try {
    const body = await request.json(); // Recebe os dados do produto (nome, preço)

    const preference = new Preference(client);

    const result = await preference.create({
      body: {
        items: [
          {
            id: '123',
            title: body.title, // Ex: "Design de Sobrancelha"
            unit_price: Number(body.price), // Ex: 45.00
            quantity: 1,
          },
        ],
        // Para onde o usuário vai depois de pagar?
        back_urls: {
            success: 'https://seusite.vercel.app/sucesso', 
            failure: 'https://seusite.vercel.app/',
            pending: 'https://seusite.vercel.app/'
        },
        auto_return: 'approved',
      },
    });

    // Retorna o link de pagamento para o frontend
    return NextResponse.json({ url: result.init_point });
    
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Erro ao criar pagamento' }, { status: 500 });
  }
}