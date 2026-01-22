"use client";

import { useState } from "react";
import { 
  CheckCircle2, 
  XCircle, 
  Clock, 
  User, 
  Smartphone, 
  Wallet, 
  AlertTriangle,
  Check
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

  // Lógica para extrair o valor que falta pagar
  const pendingAmountMatch = booking.servico.match(/Resta: (R\$ \d+[.,]\d+)/);
  const pendingAmount = pendingAmountMatch ? pendingAmountMatch[1] : null;
  
  // Limpa o nome do serviço
  const serviceNameClean = booking.servico.split('(')[0].trim();

  const handleStatusUpdate = async (newStatus: string) => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/update-status", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: booking.id, status: newStatus }),
      });

      if (!res.ok) throw new Error();
      
      toast.success("Status atualizado!");
      onUpdate();
    } catch {
      toast.error("Erro ao atualizar.");
    } finally {
      setLoading(false);
    }
  };

  // Cores do Status
  const statusColors = {
    PENDENTE: "border-yellow-500/50 bg-yellow-500/10 text-yellow-500",
    CONFIRMADO: "border-emerald-500/50 bg-emerald-500/10 text-emerald-500",
    CONCLUIDO: "border-blue-500/50 bg-blue-500/10 text-blue-500",
    CANCELADO: "border-red-500/50 bg-red-500/10 text-red-500",
  };

  const currentStatusColor = statusColors[booking.status as keyof typeof statusColors] || "border-zinc-800 bg-zinc-900 text-zinc-400";

  return (
    <div className={`relative flex flex-col gap-4 p-5 rounded-2xl border bg-zinc-900/50 backdrop-blur-sm transition-all hover:bg-zinc-900 ${currentStatusColor.replace('text-', 'border-')}`}>
      
      {/* CABEÇALHO: HORA E AÇÕES RÁPIDAS */}
      <div className="flex justify-between items-start">
        <div className="flex items-center gap-2 bg-zinc-950/50 px-3 py-1.5 rounded-lg border border-white/5">
          <Clock size={16} className="text-white" />
          <span className="text-lg font-bold text-white">{booking.horario}</span>
        </div>
        
        {/* BOTÕES DE AÇÃO RÁPIDA (Substituindo o Dropdown) */}
        <div className="flex items-center gap-1">
           {/* Confirmar (Verde) */}
           <button 
             onClick={() => handleStatusUpdate("CONFIRMADO")} 
             disabled={loading}
             title="Confirmar Agendamento"
             className="p-2 rounded-lg bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500 hover:text-white transition-colors border border-emerald-500/20"
           >
             <CheckCircle2 size={18} />
           </button>

           {/* Concluir (Azul) */}
           <button 
             onClick={() => handleStatusUpdate("CONCLUIDO")} 
             disabled={loading}
             title="Marcar como Concluído"
             className="p-2 rounded-lg bg-blue-500/10 text-blue-500 hover:bg-blue-500 hover:text-white transition-colors border border-blue-500/20"
           >
             <Check size={18} />
           </button>

           {/* Cancelar (Vermelho) */}
           <button 
             onClick={() => handleStatusUpdate("CANCELADO")} 
             disabled={loading}
             title="Cancelar Agendamento"
             className="p-2 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-colors border border-red-500/20"
           >
             <XCircle size={18} />
           </button>
        </div>
      </div>

      {/* DADOS DO CLIENTE */}
      <div className="space-y-1">
        <h3 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
           {booking.cliente}
        </h3>
        <div className="flex items-center gap-4 text-xs text-zinc-400">
           <span className="flex items-center gap-1"><Smartphone size={12}/> {booking.telefone}</span>
           <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${currentStatusColor}`}>
              {booking.status}
           </span>
        </div>
      </div>

      <div className="h-px w-full bg-white/5" />

      {/* ÁREA FINANCEIRA */}
      <div className="space-y-3">
        <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-zinc-300">{serviceNameClean}</span>
        </div>

        {/* ALERTA DE SALDO DEVEDOR */}
        {pendingAmount ? (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 flex items-start gap-3 animate-pulse">
                <div className="bg-red-500/20 p-2 rounded-full shrink-0">
                    <AlertTriangle size={18} className="text-red-500" />
                </div>
                <div className="flex flex-col">
                    <span className="text-[10px] uppercase font-bold text-red-400 tracking-wider">Atenção: Cobrar no Local</span>
                    <span className="text-lg font-black text-red-500">{pendingAmount}</span>
                    <span className="text-[10px] text-zinc-500">O cliente pagou apenas o sinal.</span>
                </div>
            </div>
        ) : (
            <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-3 flex items-center gap-3">
                <div className="bg-emerald-500/20 p-2 rounded-full">
                    <CheckCircle2 size={16} className="text-emerald-500" />
                </div>
                <div className="flex flex-col">
                    <span className="text-[10px] uppercase font-bold text-emerald-500/80">Pagamento Completo</span>
                    <span className="text-sm font-bold text-white">R$ {booking.valor.toFixed(2)}</span>
                </div>
            </div>
        )}

        <div className="flex items-center gap-2 text-[10px] text-zinc-500 bg-black/20 p-2 rounded-lg">
            <Wallet size={12} />
            <span>Método: <strong className="text-zinc-300">{booking.metodoPagamento === 'PIX' ? 'PIX' : 'Cartão'}</strong></span>
            <span className="mx-1">•</span>
            <span>Pago Online: <strong className="text-zinc-300">R$ {booking.valor.toFixed(2)}</strong></span>
        </div>
      </div>
    </div>
  );
}