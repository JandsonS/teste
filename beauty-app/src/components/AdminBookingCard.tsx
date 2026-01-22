"use client";

import { useState } from "react";
import { 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Calendar, // Importei o ícone de calendário
  Wallet, 
  AlertTriangle,
  Check,
  MessageCircle
} from "lucide-react";
import { toast } from "sonner";

interface Booking {
  id: string;
  cliente: string;
  servico: string;
  data: string;
  horario: string;
  status: string;
  telefone: string;
  valor: number;
  metodoPagamento: string;
}

interface AdminBookingCardProps {
  booking: Booking;
  onUpdate: () => void;
}

export function AdminBookingCard({ booking, onUpdate }: AdminBookingCardProps) {
  const [loading, setLoading] = useState(false);

  // Extrai valor pendente
  const pendingAmountMatch = booking.servico.match(/Resta: (R\$ \d+[.,]\d+)/);
  const pendingAmount = pendingAmountMatch ? pendingAmountMatch[1] : null;
  const serviceNameClean = booking.servico.split('(')[0].trim();

  const handleOpenWhatsApp = () => {
    const cleanPhone = booking.telefone.replace(/\D/g, "");
    const url = `https://wa.me/55${cleanPhone}`;
    window.open(url, "_blank");
  };

  const handleStatusUpdate = async (newStatus: string) => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/update-status", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: booking.id, status: newStatus }),
      });

      if (!res.ok) throw new Error();
      
      toast.success(`Status atualizado!`);
      onUpdate();
    } catch {
      toast.error("Erro ao atualizar status.");
    } finally {
      setLoading(false);
    }
  };

  const statusColors = {
    PENDENTE: "border-yellow-500/50 bg-yellow-500/10 text-yellow-500",
    CONFIRMADO: "border-emerald-500/50 bg-emerald-500/10 text-emerald-500",
    CONCLUIDO: "border-blue-500/50 bg-blue-500/10 text-blue-500",
    CANCELADO: "border-red-500/50 bg-red-500/10 text-red-500",
  };
  const currentStatusColor = statusColors[booking.status as keyof typeof statusColors] || "border-zinc-800 bg-zinc-900 text-zinc-400";

  return (
    <div className={`relative flex flex-col gap-4 p-4 rounded-xl border bg-zinc-900/50 backdrop-blur-sm transition-all hover:bg-zinc-900 group ${currentStatusColor.replace('text-', 'border-')}`}>
      
      {/* CABEÇALHO: DATA, HORA E AÇÕES */}
      <div className="flex justify-between items-start">
        <div className="flex flex-col gap-1">
             {/* DATA (NOVO) */}
             <div className="flex items-center gap-1 text-[10px] text-zinc-400 font-medium uppercase tracking-wider">
                <Calendar size={10} />
                {booking.data}
             </div>
             
             {/* HORA */}
             <div className="flex items-center gap-2 bg-zinc-950/50 px-2 py-1 rounded-md border border-white/5 w-fit">
                <Clock size={14} className="text-white" />
                <span className="text-base font-bold text-white">{booking.horario}</span>
             </div>
        </div>
        
        {/* AÇÕES RÁPIDAS (Ícones menores para caber melhor) */}
        <div className="flex items-center gap-1 bg-black/40 p-1 rounded-lg border border-white/5">
           <button onClick={() => handleStatusUpdate("CONFIRMADO")} disabled={loading} title="Confirmar" className="p-1.5 rounded hover:bg-emerald-500/20 text-zinc-500 hover:text-emerald-500 transition-all"><CheckCircle2 size={16} /></button>
           <button onClick={() => handleStatusUpdate("CONCLUIDO")} disabled={loading} title="Concluir" className="p-1.5 rounded hover:bg-blue-500/20 text-zinc-500 hover:text-blue-500 transition-all"><Check size={16} /></button>
           <button onClick={() => handleStatusUpdate("CANCELADO")} disabled={loading} title="Cancelar/Deletar" className="p-1.5 rounded hover:bg-red-500/20 text-zinc-500 hover:text-red-500 transition-all"><XCircle size={16} /></button>
        </div>
      </div>

      {/* DADOS DO CLIENTE */}
      <div className="space-y-2">
        <div className="flex justify-between items-center">
             <h3 className="text-lg font-bold text-white tracking-tight truncate max-w-[150px]" title={booking.cliente}>
                {booking.cliente}
             </h3>
             <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border ${currentStatusColor}`}>
                {booking.status}
             </span>
        </div>
        
        {/* BOTÃO WHATSAPP (NOVO VISUAL) */}
        <button 
             onClick={handleOpenWhatsApp}
             className="w-full flex items-center justify-center gap-2 text-xs font-bold bg-green-500/10 text-green-500 border border-green-500/20 py-2 rounded-lg hover:bg-green-500 hover:text-white transition-all active:scale-95"
        >
             <MessageCircle size={14} />
             {booking.telefone}
        </button>
      </div>

      <div className="h-px w-full bg-white/5" />

      {/* FINANCEIRO */}
      <div className="space-y-2">
        <span className="text-xs font-medium text-zinc-300 block truncate">{serviceNameClean}</span>

        {pendingAmount ? (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-2 flex items-center gap-3 animate-pulse">
                <AlertTriangle size={16} className="text-red-500 shrink-0" />
                <div className="flex flex-col leading-none">
                    <span className="text-[9px] uppercase font-bold text-red-400">Receber no Local</span>
                    <span className="text-sm font-black text-red-500">{pendingAmount}</span>
                </div>
            </div>
        ) : (
            <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-lg p-2 flex items-center gap-3">
                <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
                <div className="flex flex-col leading-none">
                    <span className="text-[9px] uppercase font-bold text-emerald-500/80">Pago Total</span>
                    <span className="text-sm font-bold text-white">R$ {booking.valor.toFixed(2)}</span>
                </div>
            </div>
        )}
      </div>
    </div>
  );
}