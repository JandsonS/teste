"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { format, parseISO, isValid, isToday, isTomorrow, parse } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { 
  Loader2, LogOut, CalendarDays, User, Phone, 
  LayoutDashboard, RefreshCw, Wallet, TrendingUp, Filter, Trash2, HelpCircle, AlertTriangle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";

function WhatsAppLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} xmlns="http://www.w3.org/2000/svg">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
    </svg>
  );
}

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
}

export default function AdminDashboard() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'today' | 'tomorrow' | 'all'>('today'); 
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    fetchBookings(); 
    if ('clearAppBadge' in navigator) {
        navigator.clearAppBadge().catch(() => {});
    }
    const interval = setInterval(() => {
        fetchBookings(true); 
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchBookings = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await fetch("/api/admin/bookings", { cache: "no-store" });
      if (res.status === 401) { router.push("/admin/login"); return; }
      const data = await res.json();
      if (!Array.isArray(data)) { setBookings([]); return; }

      const sortedData = data.sort((a: Booking, b: Booking) => {
        const dateA = parseSmartDate(a.bookingDate);
        const dateB = parseSmartDate(b.bookingDate);
        if (!dateA) return 1;
        if (!dateB) return -1;
        const timeA = a.bookingTime || "00:00";
        const timeB = b.bookingTime || "00:00";
        const dateTimeA = new Date(`${format(dateA, 'yyyy-MM-dd')}T${timeA}`);
        const dateTimeB = new Date(`${format(dateB, 'yyyy-MM-dd')}T${timeB}`);
        return dateTimeB.getTime() - dateTimeA.getTime();
      });

      setBookings(sortedData);
    } catch (error) {
      console.error("Erro ao atualizar dados"); 
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const handleDeleteBooking = async (id: string) => {
    if (!confirm("Tem certeza que deseja cancelar este agendamento?")) return;
    setDeletingId(id);
    try {
      const res = await fetch("/api/admin/bookings", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (res.ok) {
        toast.success("Cancelado com sucesso!");
        setBookings((prev) => prev.filter((b) => b.id !== id));
        fetchBookings(true);
      } else {
        toast.error("Erro ao cancelar.");
      }
    } catch (error) {
      toast.error("Erro de conexão.");
    } finally {
      setDeletingId(null);
    }
  };

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/admin/login");
  };

  const parseSmartDate = (dateString: string): Date | null => {
    if (!dateString) return null;
    try {
        let date = parseISO(dateString);
        if (isValid(date)) return date;
        date = parse(dateString, 'dd/MM/yyyy', new Date());
        if (isValid(date)) return date;
        return null;
    } catch { return null; }
  };

  const filteredBookings = bookings.filter(booking => {
    if (!booking.bookingDate) return false;
    const date = parseSmartDate(booking.bookingDate);
    if (!date) return false;
    if (filter === 'today') return isToday(date);
    if (filter === 'tomorrow') return isTomorrow(date);
    return true; 
  });

  const isPaid = (status: string) => {
      return ['paid', 'PAGO', 'CONFIRMADO'].includes(status);
  };

  const getPaymentLabel = (status: string, method: string) => {
      if (!isPaid(status)) return 'a receber';
      const m = method?.toUpperCase() || '';
      if (m === 'PIX') return 'pago via pix';
      if (m === 'CARTAO' || m === 'CREDIT_CARD') return 'pago via crédito';
      if (m === 'DEBITO' || m === 'DEBIT_CARD') return 'pago via débito';
      return 'pago'; 
  };

  // --- NOVA FUNÇÃO: EXTRAIR O VALOR RESTANTE DO NOME ---
  // Procura por "Resta: R$ X,XX" dentro do nome do serviço
  const getRestante = (serviceTitle: string) => {
      const match = serviceTitle.match(/Resta: (R\$ \s?[\d,.]+)/);
      return match ? match[1] : null;
  };
  
  // Limpa o nome do serviço para não ficar gigante no card
  const cleanServiceName = (title: string) => {
      return title.split('(')[0].trim();
  };

  const totalRevenue = filteredBookings.reduce((acc, curr) => acc + (isPaid(curr.status) ? (curr.pricePaid || 0) : 0), 0);
  const totalCount = filteredBookings.length;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
  };

  const formatDateDisplay = (dateString: string) => {
    const date = parseSmartDate(dateString);
    if (!date) return "Data Pendente";
    if (isToday(date)) return "Hoje";
    if (isTomorrow(date)) return "Amanhã";
    return format(date, "dd/MM", { locale: ptBR });
  };

  const getWhatsAppLink = (phone: string, name: string, date: string, time: string, service: string) => {
    if (!phone) return "#";
    const cleanPhone = phone.replace(/\D/g, '');
    const message = `Olá ${name}, confirmando agendamento de *${service}* dia *${formatDateDisplay(date)}* às *${time}*.`;
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
    <div className="min-h-screen bg-[#0a0a0a] text-zinc-100 p-4 md:p-8 overflow-x-hidden relative flex flex-col">
      <div className="fixed inset-0 z-0 pointer-events-none">
          <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-white/5 rounded-full blur-[120px] opacity-30" />
      </div>

      <header className="relative z-10 flex flex-col md:flex-row justify-between items-center mb-8 gap-4 bg-zinc-900/50 backdrop-blur-xl p-4 md:p-6 rounded-3xl border border-white/5">
        <div className="text-center md:text-left">
          <h1 className="text-xl md:text-2xl font-black tracking-tight text-white flex items-center justify-center md:justify-start gap-3">
            <LayoutDashboard className="text-white" />
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

      <main className="relative z-10 max-w-7xl mx-auto space-y-8 flex-1 w-full">
        {/* KPI CARDS */}
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
                <span className="text-white capitalize">{filter === 'all' ? 'Completa' : filter === 'today' ? 'Hoje' : 'Amanhã'}</span>
            </h2>
            <div className="bg-zinc-900 p-1 rounded-xl border border-white/5 flex w-full md:w-auto">
                <button onClick={() => setFilter('today')} className={`flex-1 md:flex-none px-6 py-2 rounded-lg text-xs font-bold uppercase transition-all ${filter === 'today' ? 'bg-zinc-800 text-white shadow-md' : 'text-zinc-500 hover:text-zinc-300'}`}>Hoje</button>
                <button onClick={() => setFilter('tomorrow')} className={`flex-1 md:flex-none px-6 py-2 rounded-lg text-xs font-bold uppercase transition-all ${filter === 'tomorrow' ? 'bg-zinc-800 text-white shadow-md' : 'text-zinc-500 hover:text-zinc-300'}`}>Amanhã</button>
                <button onClick={() => setFilter('all')} className={`flex-1 md:flex-none px-6 py-2 rounded-lg text-xs font-bold uppercase transition-all ${filter === 'all' ? 'bg-zinc-800 text-white shadow-md' : 'text-zinc-500 hover:text-zinc-300'}`}>Todos</button>
            </div>
        </div>
        
        {/* LISTAGEM DE CARDS */}
        {filteredBookings.length === 0 ? (
          <div className="text-center py-20 bg-zinc-900/30 rounded-3xl border border-white/5 backdrop-blur-sm flex flex-col items-center animate-in fade-in zoom-in duration-500">
            <div className="w-16 h-16 bg-zinc-800 rounded-full flex items-center justify-center mb-4"><Filter className="text-zinc-500" size={24} /></div>
            <p className="text-zinc-300 font-medium">Nenhum agendamento para este período.</p>
          </div>
        ) : (
          <motion.div layout className="grid gap-4 md:gap-6 grid-cols-1 lg:grid-cols-2 xl:grid-cols-3">
            <AnimatePresence>
            {filteredBookings.map((booking) => {
              const restante = getRestante(booking.serviceTitle);
              
              return (
                <motion.div
                  layout
                  key={booking.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="bg-zinc-950/80 backdrop-blur-md rounded-2xl border border-white/5 overflow-hidden hover:border-white/20 transition-all group shadow-lg flex flex-col relative"
                >
                  {/* BARRA DE STATUS */}
                  {/* Se tiver 'restante', a barra fica Amarela (Atenção), se não, Verde (Tudo Certo) */}
                  <div className={`h-1 w-full ${!isPaid(booking.status) ? 'bg-zinc-700' : (restante ? 'bg-yellow-500' : 'bg-emerald-500')}`} />

                  {/* BOTÃO CANCELAR */}
                  <button 
                    onClick={() => handleDeleteBooking(booking.id)}
                    disabled={deletingId === booking.id}
                    className="absolute top-3 right-3 px-3 py-1.5 rounded-lg bg-zinc-900/80 border border-white/10 hover:bg-red-950/30 hover:border-red-500/50 hover:text-red-400 text-zinc-500 text-[10px] font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 backdrop-blur-sm z-20 group/cancel"
                  >
                    {deletingId === booking.id ? <Loader2 size={12} className="animate-spin" /> : <><Trash2 size={12} /> Cancelar</>}
                  </button>
                  
                  <div className="p-5 space-y-4 flex-1 mt-2">
                      <div className="flex justify-between items-start gap-3 pr-2">
                          <div className="min-w-0 flex-1">
                              {/* Nome do Serviço Limpo (Sem o texto do depósito) */}
                              <h3 className="font-bold text-white text-base truncate leading-tight pr-20">{cleanServiceName(booking.serviceTitle)}</h3>
                              <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider mt-1 flex items-center gap-1">
                                  {formatDateDisplay(booking.bookingDate)} • {booking.bookingTime}
                              </p>
                          </div>
                      </div>

                      <div className="bg-white/5 p-3 rounded-xl space-y-2 border border-white/5">
                          <div className="flex items-center gap-3"><User size={14} className="text-zinc-500" /><p className="text-zinc-300 text-sm font-medium truncate">{booking.clientName}</p></div>
                          <div className="flex items-center gap-3"><Phone size={14} className="text-zinc-500" /><p className="text-zinc-400 text-xs font-mono">{booking.clientPhone}</p></div>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-white/5">
                          <div className="flex flex-col">
                               <span className="text-[10px] text-zinc-500 font-bold uppercase">Financeiro</span>
                               <div className="flex flex-col">
                                  {/* Valor Pago (Sinal ou Total) */}
                                  <div className="flex items-baseline gap-1">
                                      <span className="text-white font-bold text-sm">{formatCurrency(booking.pricePaid)}</span>
                                      <span className={`text-[10px] font-bold uppercase ${isPaid(booking.status) ? 'text-emerald-500' : 'text-amber-500'}`}>
                                          {getPaymentLabel(booking.status, booking.paymentMethod)}
                                      </span>
                                  </div>

                                  {/* ALERTA DE RESTANTE (Só aparece se for depósito) */}
                                  {restante && (
                                    <div className="flex items-center gap-1 mt-1 animate-pulse">
                                      <AlertTriangle size={10} className="text-red-500"/>
                                      <span className="text-xs font-bold text-red-500">Falta: {restante}</span>
                                    </div>
                                  )}
                               </div>
                          </div>
                          
                          <a 
                              href={getWhatsAppLink(booking.clientPhone, booking.clientName, booking.bookingDate, booking.bookingTime, booking.serviceTitle)}
                              target="_blank" rel="noopener noreferrer"
                              className="flex items-center gap-2 bg-[#25D366] hover:bg-[#128C7E] text-white px-4 py-2 rounded-xl transition-all shadow-lg shadow-emerald-900/20 hover:shadow-emerald-500/30 active:scale-95 group/btn"
                          >
                              <WhatsAppLogo className="w-4 h-4 fill-current group-hover/btn:animate-bounce" />
                              <span className="text-xs font-bold uppercase tracking-wide">WhatsApp</span>
                          </a>
                      </div>
                  </div>
                </motion.div>
              );
            })}
            </AnimatePresence>
          </motion.div>
        )}
      </main>

      <footer className="relative z-10 w-full mt-20 pb-8 flex flex-col items-center justify-center gap-4 opacity-70 hover:opacity-100 transition-opacity border-t border-white/5 pt-8">
        <p className="text-zinc-400 font-bold tracking-widest text-xs uppercase text-center">© {new Date().getFullYear()} BARBEARIA TESTE</p>
        <a href="#" className="flex items-center gap-2 bg-zinc-800/50 hover:bg-zinc-800 text-zinc-300 hover:text-white px-5 py-2 rounded-full transition-all text-xs font-bold uppercase border border-white/5 hover:border-white/20 shadow-sm"><HelpCircle size={14} />Precisa de Ajuda?</a>
      </footer>
    </div>
  );
}