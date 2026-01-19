"use client"

import { Trash2, CreditCard, QrCode, Clock, CheckCircle2, Wallet, AlertCircle } from "lucide-react"

// 1. Componente Auxiliar: CRIA AS ETIQUETAS COLORIDAS
const StatusBadge = ({ status, method }: { status: string, method?: string }) => {
  
  // CASO 1: PENDENTE (Amarelo)
  if (status === 'PENDENTE') {
    return (
      <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-yellow-500/10 border border-yellow-500/20 text-yellow-500 text-xs font-bold">
        <Clock size={12} />
        <span>Aguardando Pagamento</span>
      </div>
    );
  }

  // Define texto e ícone baseados no método (Pix ou Cartão)
  const isPix = method === 'PIX';
  const methodText = isPix ? 'Pix' : 'Cartão';
  const methodLabel = method ? methodText : 'Online'; // Texto padrão se não tiver método salvo

  // CASO 2: PAGO INTEGRAL (Verde)
  if (status === 'CONFIRMADO' || status.includes('PAGO') || status.includes('Integral')) {
    return (
      <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-xs font-bold">
        <CheckCircle2 size={12} />
        <span>Pago via {methodLabel}</span>
      </div>
    );
  }

  // CASO 3: SINAL PAGO (Azul)
  if (status.includes('SINAL') || status.includes('Sinal') || status.includes('Reserva')) {
    return (
      <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-bold">
        <Wallet size={12} />
        <span>Sinal Pago ({methodLabel})</span>
      </div>
    );
  }

  // CASO 4: OUTROS (Cinza - ex: Pagar no Local)
  return (
    <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-zinc-800 border border-zinc-700 text-zinc-400 text-xs font-bold">
      <AlertCircle size={12} />
      <span>{status}</span>
    </div>
  );
};

// 2. Componente Principal: O CARTÃO
export function AdminBookingCard({ booking, onDelete }: any) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-3 shadow-sm hover:border-zinc-700 transition-all">
      
      {/* Lado Esquerdo: Informações do Cliente */}
      <div className="flex-1">
        <div className="flex flex-wrap items-center gap-3 mb-2">
          <h3 className="text-white font-bold text-lg">{booking.cliente}</h3>
          
          {/* Aqui chamamos a etiqueta colorida */}
          <StatusBadge status={booking.status} method={booking.metodoPagamento} />
        </div>

        <div className="text-zinc-400 text-sm flex flex-col gap-1">
          <p className="flex items-center gap-2">
            <span className="text-pink-500 font-medium">✂ {booking.servico}</span>
          </p>
          <p className="flex items-center gap-2 text-zinc-500">
            📅 {booking.data} às {booking.horario}
          </p>
        </div>
      </div>

      {/* Lado Direito: Valor e Botão Cancelar */}
      <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-end mt-2 md:mt-0">
        <div className="text-right">
          <span className="block text-xs text-zinc-500">Valor</span>
          <span className="text-pink-500 font-bold text-lg">
            {Number(booking.valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          </span>
        </div>

        <button 
          onClick={() => onDelete(booking.id)}
          className="flex items-center gap-2 px-3 py-2 bg-red-500/10 text-red-500 border border-red-500/20 rounded-lg hover:bg-red-500/20 transition-colors text-sm font-medium"
        >
          <Trash2 size={16} />
          Cancelar
        </button>
      </div>
    </div>
  )
}