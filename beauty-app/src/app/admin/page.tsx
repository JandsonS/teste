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

// --- COMPONENTE DE SEÇÃO (COLUNA) ---
// Agora ele age como um cabeçalho de coluna que pode recolher
function SectionColumn({ title, date, color, count, children, defaultOpen = true }: any) {
    const [isOpen, setIsOpen] = useState(defaultOpen);
    
    const colorClasses: any = {
        emerald: "border-emerald-500 text-emerald-500 bg-emerald-500/5",
        blue: "border-blue-500 text-blue-500 bg-blue-500/5",
        purple: "border-purple-500 text-purple-500 bg-purple-500/5",
    };
    const activeStyle = colorClasses[color] || "border-zinc-500 text-zinc-500";
    const borderColor = activeStyle.split(' ')[0];

    return (
        <div className="flex flex-col gap-3 h-full">
            {/* CABEÇALHO DA COLUNA */}
            <button 
                onClick={() => setIsOpen(!isOpen)}
                className={`w-full flex items-center justify-between p-4 border rounded-xl transition-all hover:opacity-90 ${activeStyle}`}
            >
                <div className="flex flex-col items-start">
                    <h2 className="text-sm md:text-base font-bold flex items-center gap-2 uppercase tracking-wider">
                        {title}
                    </h2>
                    {date && <span className="text-xs opacity-70 font-mono">({date})</span>}
                </div>
                
                <div className="flex items-center gap-3">
                     <span className="text-xs font-bold bg-black/20 px-2 py-1 rounded-md">
                        {count}
                     </span>
                     <ChevronDown size={16} className={`transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
                </div>
            </button>

            {/* LISTA DE CARTÕES (EXPANSÍVEL) */}
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
      console.error("Erro ao buscar agendamentos", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
    const interval = setInterval(() => { fetchBookings(); }, 5000);
    return () => clearInterval(interval);
  }, []);

  // FILTROS
  const agendamentosHoje = bookings.filter(b => b.data === hojeStr);
  const agendamentosAmanha = bookings.filter(b => b.data === amanhaStr);
  const agendamentosOutros = bookings.filter(b => b.data !== hojeStr && b.data !== amanhaStr);

  // KPIs
  const totalHoje = bookings.reduce((acc, curr) => acc + (curr.status !== 'CANCELADO' ? Number(curr.valor) : 0), 0);
  const pendentes = bookings.filter(b => b.status === 'PENDENTE').length;

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8">
      
      <div className="max-w-[1400px] mx-auto space-y-8">
        
        {/* CABEÇALHO */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-white/10 pb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-black tracking-tighter text-white flex items-center gap-2">
              Painel Administrativo
            </h1>
            <p className="text-zinc-400 text-xs md:text-sm mt-1">Visão geral da agenda.</p>
          </div>

          <div className="flex items-center gap-3 bg-zinc-900/50 p-2 rounded-full border border-white/5 px-4 self-end md:self-auto">
             <div className="relative">
                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-ping absolute top-0 left-0 opacity-75"></div>
                <div className="w-2 h-2 bg-emerald-500 rounded-full relative z-10"></div>
             </div>
             <span className="text-[10px] md:text-xs text-zinc-500 font-mono hidden sm:inline">Atualizado: {lastUpdate.toLocaleTimeString()}</span>
             <button title="Atualizar lista" onClick={() => { setLoading(true); fetchBookings(); }} className="p-1 hover:bg-white/10 rounded-full transition-colors"><RefreshCw size={14} className={`text-zinc-400 ${loading ? 'animate-spin' : ''}`} /></button>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
            <div className="bg-zinc-900/50 border border-white/5 p-4 rounded-2xl flex flex-col md:flex-row items-start md:items-center gap-3 md:gap-4 col-span-2 md:col-span-1">
                <div className="w-10 h-10 bg-pink-500/10 rounded-full flex items-center justify-center text-pink-500"><CalendarDays size={20} /></div>
                <div><p className="text-zinc-500 text-[10px] uppercase font-bold">Total</p><p className="text-xl md:text-2xl font-black text-white">{bookings.length}</p></div>
            </div>
            <div className="bg-zinc-900/50 border border-white/5 p-4 rounded-2xl flex flex-col md:flex-row items-start md:items-center gap-3 md:gap-4">
                <div className="w-10 h-10 bg-yellow-500/10 rounded-full flex items-center justify-center text-yellow-500"><Users size={20} /></div>
                <div><p className="text-zinc-500 text-[10px] uppercase font-bold">Pendentes</p><p className="text-xl md:text-2xl font-black text-white">{pendentes}</p></div>
            </div>
            <div className="bg-zinc-900/50 border border-white/5 p-4 rounded-2xl flex flex-col md:flex-row items-start md:items-center gap-3 md:gap-4">
                <div className="w-10 h-10 bg-emerald-500/10 rounded-full flex items-center justify-center text-emerald-500"><DollarSign size={20} /></div>
                <div><p className="text-zinc-500 text-[10px] uppercase font-bold">Faturamento</p><p className="text-xl md:text-2xl font-black text-white">R$ {totalHoje.toFixed(2)}</p></div>
            </div>
        </div>

        {/* LAYOUT DE COLUNAS LADO A LADO (GRID) */}
        {loading && bookings.length === 0 ? (
           <div className="flex justify-center py-20"><Loader2 className="animate-spin text-pink-500 w-10 h-10" /></div>
        ) : (
          // AQUI É A MÁGICA: grid-cols-1 (Mobile) -> grid-cols-3 (PC)
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            
            {/* COLUNA 1: HOJE */}
            <SectionColumn title="Hoje" date={hojeStr} color="emerald" count={agendamentosHoje.length} defaultOpen={true}>
                {agendamentosHoje.length === 0 ? (
                    <div className="text-center py-6 border border-dashed border-zinc-800 rounded-xl bg-zinc-900/20"><p className="text-zinc-500 text-xs">Vazio.</p></div>
                ) : (
                    // Cartões um embaixo do outro na coluna
                    agendamentosHoje.map((b) => <AdminBookingCard key={b.id} booking={b} onUpdate={fetchBookings} />)
                )}
            </SectionColumn>

            {/* COLUNA 2: AMANHÃ */}
            <SectionColumn title="Amanhã" date={amanhaStr} color="blue" count={agendamentosAmanha.length} defaultOpen={true}>
                {agendamentosAmanha.length === 0 ? (
                    <div className="text-center py-6 border border-dashed border-zinc-800 rounded-xl bg-zinc-900/20"><p className="text-zinc-500 text-xs">Vazio.</p></div>
                ) : (
                    agendamentosAmanha.map((b) => <AdminBookingCard key={b.id} booking={b} onUpdate={fetchBookings} />)
                )}
            </SectionColumn>

            {/* COLUNA 3: OUTROS */}
            <SectionColumn title="Próximos" date="Futuro" color="purple" count={agendamentosOutros.length} defaultOpen={true}>
                 {agendamentosOutros.length === 0 ? (
                    <div className="text-center py-6 border border-dashed border-zinc-800 rounded-xl bg-zinc-900/20"><p className="text-zinc-500 text-xs">Vazio.</p></div>
                ) : (
                    agendamentosOutros.map((b) => <AdminBookingCard key={b.id} booking={b} onUpdate={fetchBookings} />)
                )}
            </SectionColumn>

          </div>
        )}
      </div>
    </div>
  );
}