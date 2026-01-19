"use client"

import { Trash2, CheckCircle2, Wallet, AlertCircle, MessageCircle, Clock } from "lucide-react"

const StatusBadge = ({ status, method }: { status: string, method?: string }) => {
  if (status === 'PENDENTE') {
    return (<div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-yellow-500/10 border border-yellow-500/20 text-yellow-500 text-xs font-bold"><Clock size={12} /><span>Aguardando Pagamento</span></div>);
  }
  const methodLabel = method === 'PIX' ? 'Pix' : 'Cartão';
  if (status === 'CONFIRMADO' || status.includes('PAGO') || status.includes('Integral')) {
    return (<div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-xs font-bold"><CheckCircle2 size={12} /><span>Pago via {methodLabel}</span></div>);
  }
  if (status.includes('SINAL') || status.includes('Sinal')) {
    return (<div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-bold"><Wallet size={12} /><span>Sinal Pago</span></div>);
  }
  return (<div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-zinc-800 border border-zinc-700 text-zinc-400 text-xs font-bold"><AlertCircle size={12} /><span>{status}</span></div>);
};

export function AdminBookingCard({ booking, onDelete }: any) {
  
  // FUNÇÃO QUE ABRE O WHATSAPP
  const handleWhatsapp = () => {
    if (!booking.telefone) return;
    const cleanPhone = booking.telefone.replace(/\D/g, '');
    const msg = `Olá ${booking.cliente}, tudo bem? Sobre seu agendamento de ${booking.servico} dia ${booking.data}...`;
    window.open(`https://wa.me/55${cleanPhone}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-3 shadow-sm hover:border-zinc-700 transition-all">
      <div className="flex-1">
        <div className="flex flex-wrap items-center gap-3 mb-2">
          <h3 className="text-white font-bold text-lg">{booking.cliente}</h3>
          <StatusBadge status={booking.status} method={booking.metodoPagamento} />
          
          {/* BOTÃO QUE SÓ APARECE SE TIVER TELEFONE */}
          {booking.telefone && (
            <button onClick={handleWhatsapp} title={`Chamar: ${booking.telefone}`} className="flex items-center gap-1 px-2 py-1 rounded-md bg-green-500/10 text-green-500 hover:bg-green-500/20 transition-colors text-xs font-bold border border-green-500/20">
              <MessageCircle size={12} /> Whats
            </button>
          )}
        </div>
        <div className="text-zinc-400 text-sm flex flex-col gap-1">
          <p className="flex items-center gap-2"><span className="text-pink-500 font-medium">✂ {booking.servico}</span></p>
          <p className="flex items-center gap-2 text-zinc-500">📅 {booking.data} às {booking.horario}</p>
        </div>
      </div>
      <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-end mt-2 md:mt-0">
        <div className="text-right">
          <span className="block text-xs text-zinc-500">Valor</span>
          <span className="text-pink-500 font-bold text-lg">{Number(booking.valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
        </div>
        <button onClick={() => onDelete(booking.id)} className="flex items-center gap-2 px-3 py-2 bg-red-500/10 text-red-500 border border-red-500/20 rounded-lg hover:bg-red-500/20 transition-colors text-sm font-medium"><Trash2 size={16} /> Cancelar</button>
      </div>
    </div>
  )
}