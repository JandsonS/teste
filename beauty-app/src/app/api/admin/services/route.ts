import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma"; // Usamos o import global para evitar erro de conexão

// 1. LISTAR SERVIÇOS (GET)
// Agora filtra pelo SLUG da URL (ex: /api/admin/services?slug=barbearia-vip)
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const slug = searchParams.get("slug");

    if (!slug) {
        return NextResponse.json({ error: "Slug da loja obrigatório" }, { status: 400 });
    }

    // 1. Acha a loja pelo slug
    const loja = await prisma.estabelecimento.findUnique({
        where: { slug: slug }
    });

    if (!loja) {
        return NextResponse.json({ error: "Loja não encontrada" }, { status: 404 });
    }

    // 2. Busca apenas os serviços DESSA loja
    const services = await prisma.service.findMany({
      where: { establishmentId: loja.id }, // <--- O FILTRO MÁGICO
      orderBy: { createdAt: 'asc' }
    });

    return NextResponse.json(services);

  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Erro ao buscar serviços" }, { status: 500 });
  }
}

// 2. CRIAR NOVO SERVIÇO (POST)
// Agora vincula o serviço à loja correta
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { slug, title, price, duration, description, imageUrl } = body;

    if (!slug) {
        return NextResponse.json({ error: "Erro: Loja não identificada" }, { status: 400 });
    }

    // 1. Acha a loja para pegar o ID dela
    const loja = await prisma.estabelecimento.findUnique({
        where: { slug: slug }
    });

    if (!loja) {
        return NextResponse.json({ error: "Loja não existe" }, { status: 404 });
    }

    // 2. Cria o serviço vinculado à loja (establishmentId)
    const newService = await prisma.service.create({
      data: {
        title,
        price: parseFloat(price),      
        duration: parseInt(duration),  
        description,
        imageUrl,
        active: true,
        
        // VINCULA À LOJA AQUI:
        establishmentId: loja.id 
      }
    });

    return NextResponse.json(newService);

  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Erro ao criar serviço" }, { status: 500 });
  }
}

// 3. ATUALIZAR, DESATIVAR OU DELETAR (PUT)
export async function PUT(request: Request) {
    try {
        const body = await request.json();
        const { id, action, ...data } = body; 
        
        // Se a ação for DELETAR
        if (action === 'delete') {
            await prisma.service.delete({ where: { id } });
            return NextResponse.json({ success: true });
        }

        // Se a ação for LIGAR/DESLIGAR (Toggle)
        if (action === 'toggle') {
             const current = await prisma.service.findUnique({ where: { id }});
             
             // Segurança extra: Poderíamos checar o slug aqui também, 
             // mas como o ID é único, já funciona.
             if (current) {
                await prisma.service.update({
                    where: { id },
                    data: { active: !current.active }
                 });
             }
             return NextResponse.json({ success: true });
        }

        // Se for ATUALIZAR (Editar texto/preço)
        const updated = await prisma.service.update({
            where: { id },
            data: {
                title: data.title,
                price: parseFloat(data.price),
                duration: parseInt(data.duration),
                description: data.description,
                imageUrl: data.imageUrl
            }
        });

        return NextResponse.json(updated);
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Erro ao atualizar" }, { status: 500 });
    }
}