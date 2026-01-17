import { NextResponse } from 'next/server';
import { MercadoPagoConfig, Payment } from 'mercadopago';

// Forçando a leitura da chave para garantir que não é null
const token = process.env.MP_ACCESS_TOKEN;

const client = new MercadoPagoConfig({ 
  accessToken: token || '' 
});

export async function GET() {
  try {
    if (!token) {
        return NextResponse.json({ erro: 'FATAL: MP_ACCESS_TOKEN não encontrado nas variáveis de ambiente!' });
    }

    const payment = new Payment(client);
    
    // Busca os últimos 5 pagamentos da sua conta
    const historico = await payment.search({
        options: {
            limit: 5,
            sort: 'date_created',
            criteria: 'desc'
        }
    });

    // Filtra e mostra só o que importa
    const resumo = historico.results?.map(p => ({
        id_pagamento: p.id,
        status: p.status, // Tem que estar 'approved'
        status_detail: p.status_detail,
        valor: p.transaction_amount,
        referencia_externa: p.external_reference, // TEM QUE SER O ID DO AGENDAMENTO
        data: p.date_created
    }));

    return NextResponse.json({ 
        total_encontrados: historico.paging?.total,
        ultimos_pagamentos: resumo 
    });

  } catch (error: any) {
    return NextResponse.json({ 
        erro_conexao: error.message, 
        detalhe: error.cause || 'Erro desconhecido ao conectar no Mercado Pago'
    });
  }
}