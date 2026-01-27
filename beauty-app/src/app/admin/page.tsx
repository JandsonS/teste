"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { format, parseISO, isValid, isToday, isTomorrow, parse } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { 
  Loader2, LogOut, CalendarDays, User, Phone, 
  LayoutDashboard, RefreshCw, Wallet, Filter, Trash2, HelpCircle, AlertTriangle, Search,
  CreditCard
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
  priceTotal: number;
}

export default function AdminDashboard() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'today' | 'tomorrow' | 'all'>('today'); 
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    fetchBookings(); 
    const interval = setInterval(() => fetchBookings(true), 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchBookings = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await fetch("/api/admin/bookings", { cache: "no-store" });
      if (res.status === 401) { router.push("/admin/login"); return; }
      const data = await res.json();
      setBookings(Array.isArray(data) ? data : []);
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
        fetchBookings(true);
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
        return isValid(date) ? date : null;
    } catch { return null; }
  };

  const isPaid = (status: string) => ['paid', 'PAGO', 'CONFIRMADO'].includes(status);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
  };

  const formatDateDisplay = (dateString: string) => {
    const date = parseSmartDate(dateString);
    if (!date) return "Data Pendente";
    if (isToday(date)) return "Hoje";
    if (isTomorrow(date)) return "Amanhã";
    const formatted = format(date, "dd 'de' MMMM", { locale: ptBR });
    return formatted.charAt(0).toUpperCase() + formatted.slice(1);
  };

  const finalFilteredBookings = bookings.filter(booking => {
    const date = parseSmartDate(booking.bookingDate);
    if (!date) return false;
    let matchesDate = filter === 'today' ? isToday(date) : (filter === 'tomorrow' ? isTomorrow(date) : true);
    const matchesName = booking.clientName.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesDate && matchesName;
  });

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-zinc-100 p-4 md:p-8 flex flex-col relative overflow-x-hidden">
      <header className="relative z-10 flex flex-col md:flex-row justify-between items-center mb-8 gap-4 bg-zinc-900/50 backdrop-blur-xl p-6 rounded-3xl border border-white/5">
        <h1 className="text-xl md:text-2xl font-black tracking-tight text-white flex items-center gap-3">
          <LayoutDashboard /> Painel Admin
        </h1>
        <div className="flex gap-2">
          {/* Adicionado title para resolver o erro de acessibilidade */}
          <Button title="Atualizar dados" onClick={() => fetchBookings()} variant="outline" size="sm" className="rounded-xl h-10 border-zinc-800">
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          </Button>
          <Button title="Sair do sistema" onClick={handleLogout} variant="outline" size="sm" className="rounded-xl h-10 border-zinc-800">
            <LogOut size={14} />
          </Button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto space-y-6 w-full">
        <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
            <input 
                type="text" placeholder="Buscar cliente..."
                className="w-full bg-zinc-950/50 border border-zinc-800 text-white rounded-xl pl-10 pr-4 py-3 text-sm outline-none focus:border-white/20"
                value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
            />
        </div>

        <div className="flex justify-between items-center">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <CalendarDays size={20} className="text-zinc-500" /> Agenda
            </h2>
            <div className="bg-zinc-900 p-1 rounded-xl flex gap-1 border border-white/5">
                <button onClick={() => setFilter('today')} className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${filter === 'today' ? 'bg-zinc-800 text-white' : 'text-zinc-500'}`}>Hoje</button>
                <button onClick={() => setFilter('tomorrow')} className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${filter === 'tomorrow' ? 'bg-zinc-800 text-white' : 'text-zinc-500'}`}>Amanhã</button>
                <button onClick={() => setFilter('all')} className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${filter === 'all' ? 'bg-zinc-800 text-white' : 'text-zinc-500'}`}>Todos</button>
            </div>
        </div>
        
        <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          <AnimatePresence>
          {finalFilteredBookings.map((booking) => {
            const total = Number(booking.priceTotal) || 0;
            const pago = Number(booking.pricePaid) || 0;
            const falta = total - pago;

            return (
              <motion.div layout key={booking.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="bg-zinc-950/80 rounded-2xl border border-white/5 overflow-hidden flex flex-col relative"
              >
                <div className={`h-1 w-full ${isPaid(booking.status) ? (falta > 0 ? 'bg-yellow-500' : 'bg-emerald-500') : 'bg-zinc-700'}`} />
                
                {/* Botão Cancelar com 'title' para resolver o erro discernible text */}
                <button title="Cancelar Agendamento" onClick={() => handleDeleteBooking(booking.id)} className="absolute top-3 right-3 text-zinc-500 hover:text-red-400 transition-colors">
                  <Trash2 size={14} />
                </button>

                <div className="p-5 space-y-4">
                    <div>
                        <h3 className="font-bold text-white text-base">{booking.serviceTitle.split('(')[0].trim()}</h3>
                        <p className="text-[10px] text-zinc-500 font-bold uppercase mt-1">{formatDateDisplay(booking.bookingDate)} • {booking.bookingTime}</p>
                    </div>
                    
                    <div className="bg-white/5 p-3 rounded-xl space-y-2 border border-white/5">
                        <div className="flex items-center gap-3"><User size={14} className="text-zinc-500" /><p className="text-zinc-300 text-sm truncate">{booking.clientName}</p></div>
                        <div className="flex items-center gap-3"><Phone size={14} className="text-zinc-500" /><p className="text-zinc-400 text-xs">{booking.clientPhone}</p></div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-white/5">
                        <div className="flex flex-col">
                            <span className="text-[10px] text-zinc-500 font-bold uppercase">Financeiro</span>
                            <div className="flex items-baseline gap-1">
                                <span className="text-white font-bold text-sm">{formatCurrency(booking.pricePaid)}</span>
                                <span className={`text-[10px] font-bold uppercase ${isPaid(booking.status) ? 'text-emerald-500' : 'text-amber-500'}`}>PAGO</span>
                            </div>
                            
                            {falta > 0 && (
                              <div className="flex items-center gap-1 mt-1 animate-pulse">
                                <AlertTriangle size={10} className="text-red-500"/>
                                <span className="text-xs font-bold text-red-500">
                                  Falta: {formatCurrency(falta)}
                                </span>
                              </div>
                            )}
                        </div>
                        
                        <a title="Enviar mensagem no WhatsApp" href={`https://wa.me/55${booking.clientPhone.replace(/\D/g, '')}`} target="_blank" className="bg-[#25D366] text-white px-4 py-2 rounded-xl flex items-center gap-2 hover:bg-emerald-600 transition-colors">
                            <WhatsAppLogo className="w-4 h-4" /><span className="text-xs font-bold uppercase">Zap</span>
                        </a>
                    </div>
                </div>
              </motion.div>
            );
          })}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}