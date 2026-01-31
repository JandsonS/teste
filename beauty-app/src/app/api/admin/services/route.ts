import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

// Garante que só existe uma conexão com o banco (Padrão Next.js)
const globalForPrisma = global as unknown as { prisma: PrismaClient };
const prisma = globalForPrisma.prisma || new PrismaClient();
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

// 1. LISTAR SERVIÇOS (GET)
// O Painel vai chamar isso para preencher a lista
export async function GET() {
  try {
    const services = await prisma.service.findMany({
      orderBy: { createdAt: 'asc' } // Mostra os mais antigos (corte, barba) primeiro
    });
    return NextResponse.json(services);
  } catch (error) {
    return NextResponse.json({ error: "Erro ao buscar serviços" }, { status: 500 });
  }
}

// 2. CRIAR NOVO SERVIÇO (POST)
// O Painel chama isso quando você clica em "Salvar" num novo
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { title, price, duration, description, imageUrl } = body;

    const newService = await prisma.service.create({
      data: {
        title,
        price: parseFloat(price),      // Garante que é número (30.00)
        duration: parseInt(duration),  // Garante que é inteiro (45 min)
        description,
        imageUrl,
        active: true                   // Nasce ativado por padrão
      }
    });

    return NextResponse.json(newService);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Erro ao criar serviço" }, { status: 500 });
  }
}

// 3. ATUALIZAR, DESATIVAR OU DELETAR (PUT)
// O Painel chama isso para editar preço ou remover
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
             await prisma.service.update({
                where: { id },
                data: { active: !current?.active }
             });
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