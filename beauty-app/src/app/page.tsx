import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Scissors } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center text-white p-4">
      <div className="w-24 h-24 bg-zinc-900 rounded-full flex items-center justify-center mb-6 border border-zinc-800">
        <Scissors size={40} className="text-emerald-500" />
      </div>
      
      <h1 className="text-4xl font-bold mb-2">Beauty App SaaS</h1>
      <p className="text-zinc-400 mb-8 text-center max-w-md">
        Seu sistema de agendamento multi-tenant está ativo.
        Acesse a página da sua loja para começar.
      </p>

      <div className="flex flex-col gap-4 w-full max-w-xs">
        <Link href="/barbearia-vip">
          <Button className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold h-12 rounded-xl">
            Ir para Barbearia VIP
          </Button>
        </Link>
        <Link href="/teste-barber">
          <Button variant="outline" className="w-full border-zinc-800 text-zinc-300 hover:bg-zinc-900 h-12 rounded-xl">
            Ir para Teste Barber
          </Button>
        </Link>
      </div>
      
      <p className="mt-12 text-zinc-600 text-xs">Sistema rodando em Next.js 14 + Prisma</p>
    </div>
  );
}