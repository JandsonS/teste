import { Trash2, CreditCard, QrCode, Clock, CheckCircle2, Wallet, AlertCircle } from "lucide-react"

// Função auxiliar para decidir a cor e o ícone do Status
const getStatusBadge = (status: string, method: string) => {
  // 1. STATUS PENDENTE (Amarelo)
  if (status === 'PENDENTE') {
    return (
      <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-yellow-500/10 border border-yellow-500/20 text-yellow-500 text-xs font-bold">
        <Clock size={12} />
        <span>Aguardando Pagamento</span>
      </div>
    );
  }

  // 2. ÍCONE DO MÉTODO (Pix ou Cartão)
  const MethodIcon = method === 'PIX' ? QrCode : CreditCard;
  const methodText = method === 'PIX' ? 'Pix' : 'Cartão';

  // 3. STATUS CONFIRMADO/PAGO (Verde)
  if (status === 'CONFIRMADO' || status.includes('PAGO') || status.includes('Integral')) {
    return (
      <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-xs font-bold">
        <CheckCircle2 size={12} />
        <span>Pago via {methodText}</span>
      </div>
    );
  }

  // 4. STATUS SINAL/RESERVA (Azul)
  if (status.includes('SINAL') || status.includes('Sinal')) {
    return (
      <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-bold">
        <Wallet size={12} />
        <span>Sinal Pago ({methodText})</span>
      </div>
    );
  }

  // 5. STATUS LOCAL (Cinza)
  return (
    <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-zinc-800 border border-zinc-700 text-zinc-400 text-xs font-bold">
      <AlertCircle size={12} />
      <span>Pagamento no Local</span>
    </div>
  );
};

// --- SEU COMPONENTE DE CARD ATUALIZADO ---
export function AdminBookingCard({ booking, onDelete }: any) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-3 shadow-sm hover:border-zinc-700 transition-all">
      
      {/* Informações do Cliente */}
      <div className="flex-1">
        <div className="flex items-center gap-3 mb-1">
          <h3 className="text-white font-bold text-lg">{booking.cliente}</h3>
          
          {/* AQUI ENTRA A NOVA BADGE AUTOMÁTICA */}
          {getStatusBadge(booking.status, booking.metodoPagamento)}
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

      {/* Ações e Valor */}
      <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-end">
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