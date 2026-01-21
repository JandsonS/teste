"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { format, parseISO, isValid } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { Loader2, LogOut, CalendarDays, Clock, User, Phone, CheckCircle2, AlertCircle, Smartphone, LayoutDashboard, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

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
  const router = useRouter();

  useEffect(() => {
    fetchBookings();
  }, []);

  const fetchBookings = async () => {
    try {
      const res = await fetch("/api/admin/bookings");
      
      if (res.status === 401) {
        router.push("/admin/login");
        return;
      }

      const data = await res.json();

      if (!Array.isArray(data)) {
        console.error("Dados inválidos:", data);
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
      console.error("Erro no front:", error);
      toast.error("Erro ao processar dados");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/admin/login");
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
  };

  // Melhoria na formatação de data para tentar corrigir o "Data Inválida"
  const formatDateSafe = (dateString: string) => {
    try {
      if (!dateString) return "--/--";
      // Tenta parsear direto (YYYY-MM-DD)
      let date = parseISO(dateString);
      
      // Se falhar, tenta criar data simples (caso venha string diferente)
      if (!isValid(date)) {
         date = new Date(dateString);
      }

      if (!isValid(date)) return "Data Pendente";
      return format(date, "dd/MM/yyyy");
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

  if (loading) {
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

      <header className="relative z-10 flex flex-col md:flex-row justify-between items-center mb-10 gap-4 bg-zinc-900/50 backdrop-blur-xl p-6 rounded-3xl border border-white/5">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-3">
            <LayoutDashboard className="text-white" />
            Painel Administrativo
          </h1>
          <p className="text-zinc-500 text-sm mt-1">Gerencie seus agendamentos.</p>
        </div>
        <div className="flex gap-3 w-full md:w-auto">
             <Button onClick={() => fetchBookings()} variant="outline" className="flex-1 md:flex-none border-zinc-800 bg-black/20 hover:bg-zinc-800 text-zinc-300 hover:text-white gap-2 rounded-xl">
              <RefreshCw size={16} /> <span className="hidden sm:inline">Atualizar</span>
            </Button>
            <Button onClick={handleLogout} variant="outline" className="flex-1 md:flex-none border-zinc-800 bg-black/20 hover:bg-zinc-800 text-zinc-300 hover:text-white gap-2 rounded-xl">
              <LogOut size={16} /> Sair
            </Button>
        </div>
      </header>

      <main className="relative z-10 max-w-7xl mx-auto">
        <h2 className="text-xl font-bold text-white mb-6">Agendamentos</h2>
        
        {bookings.length === 0 ? (
          <div className="text-center py-20 bg-zinc-900/30 rounded-3xl border border-white/5 backdrop-blur-sm">
            <CalendarDays className="mx-auto text-zinc-600 mb-4" size={40} />
            <p className="text-zinc-400 text-lg">Nenhum agendamento encontrado.</p>
          </div>
        ) : (
          // AQUI ESTÁ A CORREÇÃO DO GRID:
          // grid-cols-1 (Mobile/Tablet) -> Só 1 coluna para não cortar
          // lg:grid-cols-2 (Notebook) -> 2 colunas
          // xl:grid-cols-3 (Tela Grande) -> 3 colunas
          <div className="grid gap-6 grid-cols-1 lg:grid-cols-2 xl:grid-cols-3">
            {bookings.map((booking, index) => (
              <motion.div
                key={booking.id || index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="bg-zinc-950/80 backdrop-blur-md rounded-3xl border border-white/5 overflow-hidden hover:border-white/20 transition-all group shadow-lg flex flex-col"
              >
                <div className={`h-1.5 w-full ${booking.status === 'paid' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                
                <div className="p-5 md:p-6 space-y-5 flex-1">
                    <div className="flex justify-between items-start gap-2">
                        <div className="min-w-0 flex-1">
                            <p className="text-xs text-zinc-500 font-bold uppercase tracking-wider mb-1">Serviço</p>
                            <h3 className="font-bold text-white text-lg truncate">{booking.serviceTitle}</h3>
                        </div>
                        <span className={`shrink-0 px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 ${
                          booking.status === 'paid' 
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                            : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                        }`}>
                          {booking.status === 'paid' ? <CheckCircle2 size={10} /> : <AlertCircle size={10} />}
                          {booking.status === 'paid' ? 'Confirmado' : 'Pendente'}
                        </span>
                    </div>

                    <div className="flex items-center gap-3 text-zinc-300 bg-white/5 p-3 rounded-xl border border-white/5">
                        <div className="flex items-center gap-2 min-w-0">
                            <CalendarDays size={16} className="text-white shrink-0" />
                            <span className="font-medium text-sm truncate">{formatDateSafe(booking.bookingDate)}</span>
                        </div>
                        <div className="w-px h-4 bg-zinc-700 shrink-0" />
                        <div className="flex items-center gap-2">
                            <Clock size={16} className="text-white shrink-0" />
                            <span className="font-medium text-sm">{booking.bookingTime}</span>
                        </div>
                    </div>
                    
                    <div className="space-y-3">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-400 shrink-0">
                                <User size={14} />
                            </div>
                            <div className="min-w-0">
                                <p className="text-[10px] text-zinc-500 uppercase font-bold">Cliente</p>
                                <p className="text-white font-medium text-sm truncate">{booking.clientName}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-400 shrink-0">
                                <Phone size={14} />
                            </div>
                            <div className="min-w-0">
                                <p className="text-[10px] text-zinc-500 uppercase font-bold">Telefone</p>
                                <p className="text-zinc-300 text-sm truncate">{booking.clientPhone}</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-zinc-900 p-4 rounded-xl text-sm border border-zinc-800 flex justify-between items-center">
                        <div>
                            <p className="text-zinc-500 text-[10px] uppercase font-bold">Via {booking.paymentMethod === 'PIX' ? 'Pix' : 'Cartão'}</p>
                            <p className="text-white font-bold mt-0.5">{formatCurrency(booking.pricePaid)} <span className="text-[10px] font-normal text-zinc-500">pago</span></p>
                        </div>
                    </div>

                    <a 
                        href={getWhatsAppLink(booking.clientPhone, booking.clientName, booking.bookingDate, booking.bookingTime, booking.serviceTitle)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center gap-2 w-full bg-white text-black hover:bg-zinc-200 font-bold py-3 rounded-xl transition-all shadow-lg shadow-white/5 text-sm"
                    >
                        <Smartphone size={16} />
                        Confirmar no WhatsApp
                    </a>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}