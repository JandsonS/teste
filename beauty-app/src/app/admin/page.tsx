"use client";

import { useEffect, useState } from "react";
import { AdminBookingCard } from "@/components/AdminBookingCard";
import { Loader2, RefreshCw, CalendarDays, DollarSign, Users } from "lucide-react";
import { SITE_CONFIG } from "@/constants/info";

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

export default function AdminPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  // Função que busca os dados
  const fetchBookings = async () => {
    try {
      // Ajuste a rota se a sua for diferente, ex: '/api/admin/bookings' ou apenas '/api/admin'
      const res = await fetch("/api/admin", { 
        cache: "no-store" 
      });
      
      if (res.ok) {
        const data = await res.json();
        // Ordena: Pendentes primeiro, depois por horário
        const sorted = data.sort((a: Booking, b: Booking) => {
             if (a.status === 'PENDENTE' && b.status !== 'PENDENTE') return -1;
             if (a.status !== 'PENDENTE' && b.status === 'PENDENTE') return 1;
             return 0;
        });
        setBookings(sorted);
        setLastUpdate(new Date());
      }
    } catch (error) {
      console.error("Erro ao buscar agendamentos", error);
    } finally {
      setLoading(false);
    }
  };

  // EFEITO "AO VIVO" (POLLING)
  useEffect(() => {
    fetchBookings(); // Busca na hora que abre

    // Configura o relógio para buscar a cada 5 segundos (5000 ms)
    const interval = setInterval(() => {
      fetchBookings();
    }, 5000);

    // Limpa o relógio quando fecha a página para não travar o PC
    return () => clearInterval(interval);
  }, []);

  // Cálculos Rápidos para o Dashboard
  const totalHoje = bookings.reduce((acc, curr) => acc + (curr.status !== 'CANCELADO' ? Number(curr.valor) : 0), 0);
  const pendentes = bookings.filter(b => b.status === 'PENDENTE').length;

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8">
      
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* CABEÇALHO DO PAINEL */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-white/10 pb-6">
          <div>
            <h1 className="text-3xl font-black tracking-tighter text-white flex items-center gap-2">
              Painel Administrativo
            </h1>
            <p className="text-zinc-400 text-sm mt-1">
              Gerencie seus agendamentos em tempo real.
            </p>
          </div>

          <div className="flex items-center gap-3 bg-zinc-900/50 p-2 rounded-full border border-white/5 px-4">
             <div className="relative">
                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-ping absolute top-0 left-0 opacity-75"></div>
                <div className="w-2 h-2 bg-emerald-500 rounded-full relative z-10"></div>
             </div>
             <span className="text-xs text-zinc-500 font-mono">
                Atualizado: {lastUpdate.toLocaleTimeString()}
             </span>
             <button onClick={() => { setLoading(true); fetchBookings(); }} className="p-1 hover:bg-white/10 rounded-full transition-colors" title="Forçar atualização">
                <RefreshCw size={14} className={`text-zinc-400 ${loading ? 'animate-spin' : ''}`} />
             </button>
          </div>
        </div>

        {/* CARDS DE RESUMO (KPIs) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-zinc-900/50 border border-white/5 p-5 rounded-2xl flex items-center gap-4">
                <div className="w-12 h-12 bg-pink-500/10 rounded-full flex items-center justify-center text-pink-500"><CalendarDays size={24} /></div>
                <div><p className="text-zinc-500 text-xs uppercase font-bold">Agendamentos</p><p className="text-2xl font-black text-white">{bookings.length}</p></div>
            </div>
            <div className="bg-zinc-900/50 border border-white/5 p-5 rounded-2xl flex items-center gap-4">
                <div className="w-12 h-12 bg-yellow-500/10 rounded-full flex items-center justify-center text-yellow-500"><Users size={24} /></div>
                <div><p className="text-zinc-500 text-xs uppercase font-bold">Pendentes</p><p className="text-2xl font-black text-white">{pendentes}</p></div>
            </div>
            <div className="bg-zinc-900/50 border border-white/5 p-5 rounded-2xl flex items-center gap-4">
                <div className="w-12 h-12 bg-emerald-500/10 rounded-full flex items-center justify-center text-emerald-500"><DollarSign size={24} /></div>
                <div><p className="text-zinc-500 text-xs uppercase font-bold">Faturamento (Previsto)</p><p className="text-2xl font-black text-white">R$ {totalHoje.toFixed(2)}</p></div>
            </div>
        </div>

        {/* LISTA DE AGENDAMENTOS */}
        <div>
          <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            Agenda do Dia
          </h2>
          
          {loading && bookings.length === 0 ? (
            <div className="flex justify-center py-20">
              <Loader2 className="animate-spin text-pink-500 w-10 h-10" />
            </div>
          ) : bookings.length === 0 ? (
            <div className="text-center py-20 border border-dashed border-zinc-800 rounded-3xl">
              <p className="text-zinc-500">Nenhum agendamento para hoje ainda.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {bookings.map((booking) => (
                <AdminBookingCard 
                    key={booking.id} 
                    booking={booking} 
                    onUpdate={fetchBookings} // Se atualizar um status, recarrega a lista
                />
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}