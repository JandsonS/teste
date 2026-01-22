"use client";

import { useState } from "react";
import { CheckCircle2, XCircle, Clock, Calendar, AlertTriangle, Check, MessageCircle } from "lucide-react";
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

  const pendingAmountMatch = booking.servico.match(/Resta: (R\$ \d+[.,]\d+)/);
  const pendingAmount = pendingAmountMatch ? pendingAmountMatch[1] : null;
  const serviceNameClean = booking.servico.split('(')[0].trim();

  const handleOpenWhatsApp = () => {
    const cleanPhone = booking.telefone.replace(/\D/g, "");
    window.open(`https://wa.me/55${cleanPhone}`, "_blank");
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
      toast.success(`Atualizado!`);
      onUpdate();
    } catch {
      toast.error("Erro ao atualizar.");
    } finally {
      setLoading(false);
    }
  };

  // Cores apenas para a borda lateral e texto do status
  const statusColors = {
    PENDENTE: "border-l-yellow-500",
    CONFIRMADO: "border-l-emerald-500",
    CONCLUIDO: "border-l-blue-500",
    CANCELADO: "border-l-red-500",
  };
  
  const statusBadgeColors = {
    PENDENTE: "text-yellow-500 bg-yellow-500/10 border-yellow-500/20",
    CONFIRMADO: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20",
    CONCLUIDO: "text-blue-500 bg-blue-500/10 border-blue-500/20",
    CANCELADO: "text-red-500 bg-red-500/10 border-red-500/20",
  };

  const borderLeftClass = statusColors[booking.status as keyof typeof statusColors] || "border-l-zinc-500";
  const badgeClass = statusBadgeColors[booking.status as keyof typeof statusBadgeColors] || "text-zinc-400 bg-zinc-800";

  return (
    <div className={`relative flex flex-col gap-3 p-4 rounded-lg bg-zinc-900 border border-zinc-800 shadow-sm transition-all hover:border-zinc-700 hover:shadow-md border-l-4 ${borderLeftClass}`}>
      
      {/* LINHA 1: Data/Hora e Ações */}
      <div className="flex justify-between items-start">
        <div className="flex flex-col">
             <div className="flex items-center gap-1.5 text-[10px] text-zinc-500 font-medium uppercase tracking-wider mb-1">
                <Calendar size={10} />
                {booking.data}
             </div>
             <div className="flex items-center gap-1.5 text-zinc-200">
                <Clock size={14} className="text-zinc-500" />
                <span className="text-sm font-bold font-mono">{booking.horario}</span>
             </div>
        </div>
        
        {/* Ações Minimalistas */}
        <div className="flex items-center gap-1">
           <button onClick={() => handleStatusUpdate("CONFIRMADO")} disabled={loading} title="Confirmar" className="p-1.5 rounded-md text-zinc-600 hover:text-emerald-500 hover:bg-zinc-800 transition-all"><CheckCircle2 size={16} /></button>
           <button onClick={() => handleStatusUpdate("CONCLUIDO")} disabled={loading} title="Concluir" className="p-1.5 rounded-md text-zinc-600 hover:text-blue-500 hover:bg-zinc-800 transition-all"><Check size={16} /></button>
           <button onClick={() => handleStatusUpdate("CANCELADO")} disabled={loading} title="Cancelar" className="p-1.5 rounded-md text-zinc-600 hover:text-red-500 hover:bg-zinc-800 transition-all"><XCircle size={16} /></button>
        </div>
      </div>

      {/* LINHA 2: Cliente e Status */}
      <div>
        <div className="flex justify-between items-start mb-2">
             <h3 className="text-base font-bold text-zinc-100 truncate pr-2">{booking.cliente}</h3>
             <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded border ${badgeClass}`}>
                {booking.status}
             </span>
        </div>
        
        {/* Botão WhatsApp Discreto */}
        <button 
             onClick={handleOpenWhatsApp}
             className="w-full flex items-center justify-center gap-2 text-xs font-medium text-zinc-400 bg-zinc-950 border border-zinc-800 py-1.5 rounded hover:text-emerald-500 hover:border-emerald-500/30 transition-all"
        >
             <MessageCircle size={12} />
             {booking.telefone}
        </button>
      </div>

      <div className="h-px w-full bg-zinc-800" />

      {/* LINHA 3: Financeiro */}
      <div className="flex justify-between items-center">
        <span className="text-xs font-medium text-zinc-400 truncate max-w-[120px]" title={serviceNameClean}>{serviceNameClean}</span>

        {pendingAmount ? (
            <div className="flex items-center gap-1.5 text-red-400 bg-red-500/5 px-2 py-1 rounded border border-red-500/10">
                <AlertTriangle size={12} />
                <span className="text-xs font-bold">{pendingAmount}</span>
            </div>
        ) : (
            <div className="flex items-center gap-1.5 text-emerald-500 bg-emerald-500/5 px-2 py-1 rounded border border-emerald-500/10">
                <CheckCircle2 size={12} />
                <span className="text-xs font-bold">R$ {booking.valor.toFixed(2)}</span>
            </div>
        )}
      </div>
    </div>
  );
}