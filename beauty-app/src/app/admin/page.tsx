"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { format, parseISO, isValid, isToday, isTomorrow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { 
  Loader2, LogOut, CalendarDays, Clock, User, Phone, 
  CheckCircle2, AlertCircle, Smartphone, LayoutDashboard, 
  RefreshCw, Wallet, TrendingUp, Filter, MessageCircle 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";

interface Booking {
  id: string;
  clientName: string;
  clientPhone: string;
  serviceTitle: string;
  bookingDate: string;
  bookingTime: string;
  status: string;
  paymentMethod: string;
  pricePaid: number;
  pricePending: number;
}

export default function AdminDashboard() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'today' | 'tomorrow' | 'all'>('today'); 
  const router = useRouter();

  useEffect(() => {
    fetchBookings();
  }, []);

  const fetchBookings = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/bookings");
      
      if (res.status === 401) {
        router.push("/admin/login");
        return;
      }

      const data = await res.json();

      if (!Array.isArray(data)) {
        setBookings([]);
        return;
      }

      const sortedData = data.sort((a: Booking, b: Booking) => {
        const dateA = new Date(`${a.bookingDate}T${a.bookingTime}`);
        const dateB = new Date(`${b.bookingDate}T${b.bookingTime}`);
        if (isNaN(dateA.getTime())) return 1;
        if (isNaN(dateB.getTime())) return -1;
        return dateB.getTime() - dateA.getTime();
      });

      setBookings(sortedData);
    } catch (error) {
      toast.error("Erro ao atualizar dados");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/admin/login");
  };

  const filteredBookings = bookings.filter(booking => {
    if (!booking.bookingDate) return false;
    const date = parseISO(booking.bookingDate);
    
    if (filter === 'today') return isToday(date);
    if (filter === 'tomorrow') return isTomorrow(date);
    return true; 
  });

  const totalRevenue = filteredBookings.reduce((acc, curr) => acc + (curr.pricePaid || 0), 0);
  const totalCount = filteredBookings.length;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
  };

  const formatDateSafe = (dateString: string) => {
    try {
      if (!dateString) return "--/--";
      let date = parseISO(dateString);
      if (!isValid(date)) date = new Date(dateString);
      if (!isValid(date)) return "Data Pendente";
      
      if (isToday(date)) return "Hoje";
      if (isTomorrow(date)) return "Amanhã";
      
      return format(date, "dd/MM", { locale: ptBR });
    } catch (e) {
      return "Data Pendente";
    }
  };

  const getWhatsAppLink = (phone: string, name: string, date: string, time: string, service: string) => {
    if (!phone) return "#";
    const cleanPhone = phone.replace(/\D/g, '');
    const message = `Olá ${name}, confirmando agendamento de *${service}* dia *${formatDateSafe(date)}* às *${time}*.`;
    return `https://wa.me/55${cleanPhone}?text=${encodeURIComponent(message)}`;
  };

  if (loading && bookings.length === 0) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <Loader2 className="animate-spin text-white w-8 h-8" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-zinc-100 p-4 md:p-8 overflow-x-hidden relative">
      <div className="fixed inset-0 z-0 pointer-events-none">
          <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-white/5 rounded-full blur-[120px] opacity-30" />
      </div>

      <header className="relative z-10 flex flex-col md:flex-row justify-between items-center mb-8 gap-4 bg-zinc-900/50 backdrop-blur-xl p-4 md:p-6 rounded-3xl border border-white/5">
        <div className="text-center md:text-left">
          <h1 className="text-xl md:text-2xl font-black tracking-tight text-white flex items-center justify-center md:justify-start gap-3">
            <LayoutDashboard className="text-pink-500" />
            Painel Admin
          </h1>
          <p className="text-zinc-500 text-xs md:text-sm mt-1">Visão geral do negócio</p>
        </div>
        <div className="flex gap-2">
            <Button onClick={() => fetchBookings()} variant="outline" size="sm" className="border-zinc-800 bg-black/20 hover:bg-zinc-800 text-zinc-300 hover:text-white gap-2 rounded-xl h-10">
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Atualizar
            </Button>
            <Button onClick={handleLogout} variant="outline" size="sm" className="border-zinc-800 bg-black/20 hover:bg-zinc-800 text-zinc-300 hover:text-white gap-2 rounded-xl h-10">
              <LogOut size={14} /> Sair
            </Button>
        </div>
      </header>

      <main className="relative z-10 max-w-7xl mx-auto space-y-8">
        
        {/* CARDS DE RESUMO */}
        <div className="grid grid-cols-2 gap-4">
            <div className="bg-zinc-900/80 border border-zinc-800 p-5 rounded-2xl flex flex-col justify-between relative overflow-hidden group">
                <div className="absolute right-0 top-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity"><Wallet size={48} /></div>
                <p className="text-zinc-500 text-xs font-bold uppercase tracking-wider">Faturamento ({filter === 'all' ? 'Total' : filter === 'today' ? 'Hoje' : 'Amanhã'})</p>
                <p className="text-2xl md:text-4xl font-black text-white mt-2">{formatCurrency(totalRevenue)}</p>
            </div>
            <div className="bg-zinc-900/80 border border-zinc-800 p-5 rounded-2xl flex flex-col justify-between relative overflow-hidden group">
                <div className="absolute right-0 top-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity"><TrendingUp size={48} /></div>
                <p className="text-zinc-500 text-xs font-bold uppercase tracking-wider">Agendamentos</p>
                <div className="flex items-end gap-2">
                    <p className="text-2xl md:text-4xl font-black text-white mt-2">{totalCount}</p>
                    <span className="text-zinc-500 text-sm mb-1.5 font-medium">clientes</span>
                </div>
            </div>
        </div>

        {/* FILTROS */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <CalendarDays className="text-zinc-500" size={20} /> 
                Agenda <span className="text-zinc-600">|</span> 
                <span className="text-pink-500 capitalize">{filter === 'all' ? 'Completa' : filter === 'today' ? 'Hoje' : 'Amanhã'}</span>
            </h2>
            
            <div className="bg-zinc-900 p-1 rounded-xl border border-white/5 flex w-full md:w-auto">
                <button onClick={() => setFilter('today')} className={`flex-1 md:flex-none px-6 py-2 rounded-lg text-xs font-bold uppercase transition-all ${filter === 'today' ? 'bg-zinc-800 text-white shadow-md' : 'text-zinc-500 hover:text-zinc-300'}`}>Hoje</button>
                <button onClick={() => setFilter('tomorrow')} className={`flex-1 md:flex-none px-6 py-2 rounded-lg text-xs font-bold uppercase transition-all ${filter === 'tomorrow' ? 'bg-zinc-800 text-white shadow-md' : 'text-zinc-500 hover:text-zinc-300'}`}>Amanhã</button>
                <button onClick={() => setFilter('all')} className={`flex-1 md:flex-none px-6 py-2 rounded-lg text-xs font-bold uppercase transition-all ${filter === 'all' ? 'bg-zinc-800 text-white shadow-md' : 'text-zinc-500 hover:text-zinc-300'}`}>Todos</button>
            </div>
        </div>
        
        {/* LISTA DE CARDS */}
        {filteredBookings.length === 0 ? (
          <div className="text-center py-20 bg-zinc-900/30 rounded-3xl border border-white/5 backdrop-blur-sm flex flex-col items-center animate-in fade-in zoom-in duration-500">
            <div className="w-16 h-16 bg-zinc-800 rounded-full flex items-center justify-center mb-4">
                <Filter className="text-zinc-500" size={24} />
            </div>
            <p className="text-zinc-300 font-medium">Nenhum agendamento para este período.</p>
            <p className="text-zinc-600 text-sm mt-1">Altere o filtro acima para ver outros dias.</p>
          </div>
        ) : (
          <motion.div layout className="grid gap-4 md:gap-6 grid-cols-1 lg:grid-cols-2 xl:grid-cols-3">
            <AnimatePresence>
            {filteredBookings.map((booking) => (
              <motion.div
                layout
                key={booking.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="bg-zinc-950/80 backdrop-blur-md rounded-2xl border border-white/5 overflow-hidden hover:border-pink-500/20 transition-all group shadow-lg flex flex-col"
              >
                <div className={`h-1 w-full ${booking.status === 'paid' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                
                <div className="p-5 space-y-4 flex-1">
                    <div className="flex justify-between items-start gap-3">
                        <div className="min-w-0 flex-1">
                            <h3 className="font-bold text-white text-base truncate leading-tight">{booking.serviceTitle}</h3>
                            <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider mt-1 flex items-center gap-1">
                                {formatDateSafe(booking.bookingDate)} • {booking.bookingTime}
                            </p>
                        </div>
                        <span className={`shrink-0 w-6 h-6 rounded-full flex items-center justify-center ${
                          booking.status === 'paid' ? 'bg-emerald-500/20 text-emerald-500' : 'bg-amber-500/20 text-amber-500'
                        }`}>
                          {booking.status === 'paid' ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
                        </span>
                    </div>

                    <div className="bg-white/5 p-3 rounded-xl space-y-2 border border-white/5">
                        <div className="flex items-center gap-3">
                            <User size={14} className="text-zinc-500" />
                            <p className="text-zinc-300 text-sm font-medium truncate">{booking.clientName}</p>
                        </div>
                        <div className="flex items-center gap-3">
                            <Phone size={14} className="text-zinc-500" />
                            <p className="text-zinc-400 text-xs font-mono">{booking.clientPhone}</p>
                        </div>
                    </div>

                    {/* RODAPÉ DO CARD COM BOTÃO WHATSAPP MELHORADO */}
                    <div className="flex items-center justify-between pt-2 border-t border-white/5">
                        <div className="flex flex-col">
                             <span className="text-[10px] text-zinc-500 font-bold uppercase">Valor</span>
                             <div className="flex items-baseline gap-1">
                                <span className="text-white font-bold text-sm">{formatCurrency(booking.pricePaid)}</span>
                                <span className={`text-[10px] ${booking.status === 'paid' ? 'text-emerald-500' : 'text-amber-500'}`}>
                                    {booking.status === 'paid' ? 'pago' : 'a receber'}
                                </span>
                             </div>
                        </div>
                        
                        <a 
                            href={getWhatsAppLink(booking.clientPhone, booking.clientName, booking.bookingDate, booking.bookingTime, booking.serviceTitle)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-xl transition-all shadow-lg shadow-emerald-900/20 hover:shadow-emerald-500/30 active:scale-95 group/btn"
                        >
                            <MessageCircle size={16} className="group-hover/btn:animate-bounce" />
                            <span className="text-xs font-bold uppercase tracking-wide">WhatsApp</span>
                        </a>
                    </div>
                </div>
              </motion.div>
            ))}
            </AnimatePresence>
          </motion.div>
        )}
      </main>
    </div>
  );
}