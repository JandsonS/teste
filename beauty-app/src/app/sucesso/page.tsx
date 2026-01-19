"use client"

import { useEffect, useState, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { CheckCircle2, Home, Loader2, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"

// Componente interno para ler os parâmetros da URL
function SuccessContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [count, setCount] = useState(5)
  
  // Pega o status direto da URL do Mercado Pago
  const status = searchParams.get('collection_status')
  const paymentId = searchParams.get('payment_id')
  
  const isApproved = status === 'approved'

  // Lógica de Redirecionamento Automático
  useEffect(() => {
    if (!isApproved) return;

    const timer = setInterval(() => {
      setCount((prev) => {
        if (prev <= 1) {
          clearInterval(timer)
          router.push('/') // Redireciona para a Home
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [isApproved, router])

  return (
    <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-3xl shadow-2xl max-w-md w-full text-center flex flex-col items-center animate-in fade-in zoom-in duration-500">
      
      {/* CENÁRIO 1: APROVADO */}
      {isApproved ? (
        <>
          <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mb-6 ring-2 ring-emerald-500/50 shadow-[0_0_30px_rgba(16,185,129,0.2)]">
            <CheckCircle2 className="w-10 h-10 text-emerald-500" />
          </div>

          <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">
            Pagamento Confirmado!
          </h1>
          <p className="text-zinc-400 mb-6">
            Seu horário foi agendado com sucesso. Te esperamos lá!
          </p>
          
          <div className="text-xs text-zinc-600 mb-6 bg-zinc-950/50 py-2 px-4 rounded-lg font-mono">
            ID da Transação: {paymentId}
          </div>

          <div className="w-full bg-zinc-800 h-1 rounded-full overflow-hidden mb-4">
            <div 
              className="bg-emerald-500 h-full transition-all duration-1000 ease-linear" 
              style={{ width: `${(count / 5) * 100}%` }}
            />
          </div>

          <p className="text-sm text-zinc-500 mb-6">
            Voltando para o início em <span className="text-white font-bold">{count}s</span>...
          </p>

          <Button 
            onClick={() => router.push('/')}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-12 rounded-xl"
          >
            <Home className="mr-2 w-4 h-4" />
            Voltar Agora
          </Button>
        </>
      ) : (
        /* CENÁRIO 2: PENDENTE OU ERRO */
        <>
          <div className="w-20 h-20 bg-yellow-500/10 rounded-full flex items-center justify-center mb-6 ring-2 ring-yellow-500/50">
            <AlertCircle className="w-10 h-10 text-yellow-500" />
          </div>

          <h1 className="text-2xl font-bold text-white mb-2">
            Processando Pagamento
          </h1>
          <p className="text-zinc-400 mb-6">
            Estamos aguardando a confirmação do banco. Se você já pagou, seu agendamento aparecerá em breve.
          </p>

          <Button 
            onClick={() => router.push('/')}
            variant="outline"
            className="w-full border-zinc-700 text-white hover:bg-zinc-800 h-12 rounded-xl"
          >
            Voltar para o Início
          </Button>
        </>
      )}
    </div>
  )
}

// Página Principal
export default function SuccessPage() {
  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-zinc-900 via-black to-black">
      <Suspense fallback={<Loader2 className="w-10 h-10 text-pink-500 animate-spin" />}>
        <SuccessContent />
      </Suspense>
    </div>
  )
}