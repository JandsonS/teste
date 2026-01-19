import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const globalForPrisma = global as unknown as { prisma: PrismaClient };
const prisma = globalForPrisma.prisma || new PrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const date = searchParams.get('date');
  const service = searchParams.get('service'); 

  if (!date) {
    return NextResponse.json({ error: 'Data obrigatória' }, { status: 400 });
  }

  // 1. CONFIGURAÇÃO DE GRUPOS (Para manter a separação Barba vs Sobrancelha)
  const GRUPO_BARBEARIA = ['Corte', 'Barba', 'Combo'];
  const GRUPO_ESTETICA = ['Sobrancelha'];

  let grupoAtual: string[] = [];

  if (service) {
      const serviceLower = service.toLowerCase();
      // Verifica se é estética, senão assume barbearia
      const isEstetica = GRUPO_ESTETICA.some(item => serviceLower.includes(item.toLowerCase()));
      
      if (isEstetica) grupoAtual = GRUPO_ESTETICA;
      else grupoAtual = GRUPO_BARBEARIA;
  } else {
      grupoAtual = GRUPO_BARBEARIA;
  }

  try {
    const agendamentosDoDia = await prisma.agendamento.findMany({
      where: { 
        data: date,
        status: { not: 'CANCELADO' }
      },
      select: { horario: true, servico: true, status: true } 
    });

    const busySlots = agendamentosDoDia
      .filter(agendamento => {
        const servicoAgendado = agendamento.servico.toLowerCase();
        
        // 1. Verifica conflito de grupo (Quem bloqueia quem)
        const fazParteDoGrupo = grupoAtual.some(itemDoGrupo => servicoAgendado.includes(itemDoGrupo.toLowerCase()));
        if (!fazParteDoGrupo) return false; // Se é de outro setor, ignora.

        // >>> A CORREÇÃO ESTÁ AQUI <<<
        // Só marcamos como "OCUPADO VISUALMENTE" se estiver 100% PAGO ou CONFIRMADO.
        // Se estiver "PENDENTE", deixamos parecer LIVRE no calendário.
        // Por que? Para o cliente clicar e receber a mensagem de "Aguarde 2 minutos" do Backend.
        
        const ocupadoDefinitivo = agendamento.status.includes('PAGO') || 
                                  agendamento.status.includes('SINAL') || 
                                  agendamento.status === 'CONFIRMADO';

        return ocupadoDefinitivo;
      })
      .map(a => a.horario);

    return NextResponse.json({ busy: busySlots });

  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Erro ao buscar disponibilidade' }, { status: 500 });
  }
}