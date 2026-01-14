import { NextResponse } from 'next/server';
import { MercadoPagoConfig, Preference } from 'mercadopago';
import { SITE_CONFIG } from '@/constants/info'; // Importamos as configs do site

// 1. SEGURANÇA:
// Agora ele busca a senha no arquivo .env.local (ou na Vercel)
// O "!" no final diz ao TypeScript: "Pode confiar, essa variável existe!"
const client = new MercadoPagoConfig({ 
  accessToken: process.env.MP_ACCESS_TOKEN! 
});

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const preference = new Preference(client);

    const result = await preference.create({
      body: {
        items: [
          {
            id: '123', // ID genérico ou dinâmico
            title: body.title,
            unit_price: Number(body.price),
            quantity: 1,
          },
        ],
        // 2. FLEXIBILIDADE:
        // Usamos a URL do arquivo info.ts. 
        // Se você mudar o site de domínio, muda aqui sozinho.
        back_urls: {
          success: `${SITE_CONFIG.url}/sucesso`,
          failure: `${SITE_CONFIG.url}/`,
          pending: `${SITE_CONFIG.url}/`,
        },
        auto_return: 'approved',
      },
    });

    return NextResponse.json({ url: result.init_point });
    
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Erro ao criar pagamento' }, { status: 500 });
  }
}