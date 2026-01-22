"use client";

import { useEffect, useState } from "react";
import { AdminBookingCard } from "@/components/AdminBookingCard";
import { Loader2, RefreshCw, CalendarDays, DollarSign, Users, ChevronDown } from "lucide-react";
import { format, addDays } from "date-fns"; 

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

// --- NOVO DESIGN DA COLUNA (SÓBRIO) ---
function SectionColumn({ title, date, count, children, defaultOpen = true }: any) {
    const [isOpen, setIsOpen] = useState(defaultOpen);

    return (
        <div className="flex flex-col gap-3 h-full">
            {/* Cabeçalho Neutro e Profissional */}
            <button 
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-between p-4 bg-zinc-900 border border-zinc-800 rounded-xl hover:border-zinc-700 transition-all group"
            >
                <div className="flex flex-col items-start">
                    <h2 className="text-sm font-bold text-zinc-100 flex items-center gap-2 uppercase tracking-wide">
                        {title}
                    </h2>
                    {date && <span className="text-xs text-zinc-500 font-mono">({date})</span>}
                </div>
                
                <div className="flex items-center gap-3">
                     <span className="text-xs font-bold bg-zinc-800 text-zinc-400 px-2 py-1 rounded-md group-hover:bg-zinc-700 transition-colors">
                        {count}
                     </span>
                     <ChevronDown size={16} className={`text-zinc-500 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
                </div>
            </button>

            {/* Conteúdo */}
            {isOpen && (
                <div className="flex flex-col gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
                    {children}
                </div>
            )}
        </div>
    );
}

export default function AdminPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  const hojeStr = format(new Date(), "dd/MM/yyyy");
  const amanhaStr = format(addDays(new Date(), 1), "dd/MM/yyyy");

  const fetchBookings = async () => {
    try {
      const res = await fetch("/api/admin", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        const sorted = data.sort((a: Booking, b: Booking) => {
             if (a.status === 'PENDENTE' && b.status !== 'PENDENTE') return -1;
             if (a.status !== 'PENDENTE' && b.status === 'PENDENTE') return 1;
             const dateA = a.data.split('/').reverse().join('');
             const dateB = b.data.split('/').reverse().join('');
             if (dateA < dateB) return -1;
             if (dateA > dateB) return 1;
             return a.horario.localeCompare(b.horario);
        });
        setBookings(sorted);
        setLastUpdate(new Date());
      }
    } catch (error) {
      console.error("Erro", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
    const interval = setInterval(() => { fetchBookings(); }, 5000);
    return () => clearInterval(interval);
  }, []);

  const agendamentosHoje = bookings.filter(b => b.data === hojeStr);
  const agendamentosAmanha = bookings.filter(b => b.data === amanhaStr);
  const agendamentosOutros = bookings.filter(b => b.data !== hojeStr && b.data !== amanhaStr);

  const totalHoje = bookings.reduce((acc, curr) => acc + (curr.status !== 'CANCELADO' ? Number(curr.valor) : 0), 0);
  const pendentes = bookings.filter(b => b.status === 'PENDENTE').length;

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8">
      <div className="max-w-[1400px] mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-white/5 pb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white">Painel Administrativo</h1>
            <p className="text-zinc-400 text-xs md:text-sm mt-1">Gestão de agenda.</p>
          </div>
          <div className="flex items-center gap-3 bg-zinc-900 p-2 rounded-full border border-zinc-800 px-4 self-end md:self-auto">
             <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
             <span className="text-[10px] md:text-xs text-zinc-500 font-mono hidden sm:inline">{lastUpdate.toLocaleTimeString()}</span>
             <button title="Atualizar" onClick={() => { setLoading(true); fetchBookings(); }} className="p-1 hover:text-white transition-colors"><RefreshCw size={14} className={`text-zinc-500 ${loading ? 'animate-spin' : ''}`} /></button>
          </div>
        </div>

        {/* KPIs Limpos */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
            <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl flex items-center gap-4">
                <div className="p-2 bg-zinc-800 rounded-lg text-zinc-400"><CalendarDays size={20} /></div>
                <div><p className="text-zinc-500 text-[10px] uppercase font-bold">Total</p><p className="text-xl font-bold text-white">{bookings.length}</p></div>
            </div>
            <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl flex items-center gap-4">
                <div className="p-2 bg-zinc-800 rounded-lg text-yellow-500"><Users size={20} /></div>
                <div><p className="text-zinc-500 text-[10px] uppercase font-bold">Pendentes</p><p className="text-xl font-bold text-white">{pendentes}</p></div>
            </div>
            <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl flex items-center gap-4">
                <div className="p-2 bg-zinc-800 rounded-lg text-emerald-500"><DollarSign size={20} /></div>
                <div><p className="text-zinc-500 text-[10px] uppercase font-bold">Faturamento</p><p className="text-xl font-bold text-white">R$ {totalHoje.toFixed(2)}</p></div>
            </div>
        </div>

        {/* Colunas */}
        {loading && bookings.length === 0 ? (
           <div className="flex justify-center py-20"><Loader2 className="animate-spin text-zinc-600 w-8 h-8" /></div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            <SectionColumn title="Hoje" date={hojeStr} count={agendamentosHoje.length}>
                {agendamentosHoje.map((b) => <AdminBookingCard key={b.id} booking={b} onUpdate={fetchBookings} />)}
            </SectionColumn>

            <SectionColumn title="Amanhã" date={amanhaStr} count={agendamentosAmanha.length}>
                {agendamentosAmanha.map((b) => <AdminBookingCard key={b.id} booking={b} onUpdate={fetchBookings} />)}
            </SectionColumn>

            <SectionColumn title="Próximos" date="Futuro" count={agendamentosOutros.length}>
                {agendamentosOutros.map((b) => <AdminBookingCard key={b.id} booking={b} onUpdate={fetchBookings} />)}
            </SectionColumn>
          </div>
        )}
      </div>
    </div>
  );
}