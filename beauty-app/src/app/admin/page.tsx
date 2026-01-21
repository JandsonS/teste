"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { Loader2, LogOut, CalendarDays, Clock, User, Phone, CheckCircle2, AlertCircle, Smartphone, LayoutDashboard, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

interface Booking { id: string; clientName: string; clientPhone: string; serviceTitle: string; bookingDate: string; bookingTime: string; status: string; paymentMethod: string; paymentType: string; priceTotal: number; pricePaid: number; pricePending: number; createdAt: string; }

export default function AdminDashboard() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => { fetchBookings(); }, []);

  const fetchBookings = async () => {
    try {
      const res = await fetch("/api/admin/bookings");
      if (res.status === 401) { router.push("/admin/login"); return; }
      if (!res.ok) throw new Error("Falha");
      const data = await res.json();
      setBookings(data.sort((a:Booking, b:Booking) => new Date(`${b.bookingDate}T${b.bookingTime}`).getTime() - new Date(`${a.bookingDate}T${a.bookingTime}`).getTime()));
    } catch { toast.error("Erro ao carregar"); } finally { setLoading(false); }
  };

  const handleLogout = async () => { await fetch("/api/auth/logout", { method: "POST" }); router.push("/admin/login"); };
  const formatCurrency = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);
  const getWhatsAppLink = (p: string, n: string, d: string, t: string, s: string) => `https://wa.me/55${p.replace(/\D/g, '')}?text=${encodeURIComponent(`Olá ${n}, confirmando agendamento de *${s}* dia *${format(parseISO(d), "dd/MM", { locale: ptBR })}* às *${t}*.`)}`;

  if (loading) return <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center"><Loader2 className="animate-spin text-white w-8 h-8" /></div>;

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-zinc-100 p-4 md:p-8 overflow-x-hidden relative">
      <div className="fixed inset-0 z-0 pointer-events-none"><div className="absolute top-[-10%] right-[-10%] w-[300px] md:w-[500px] h-[300px] md:h-[500px] bg-white/5 rounded-full blur-[80px] md:blur-[120px] opacity-30" /></div>

      <header className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4 bg-zinc-900/50 backdrop-blur-xl p-6 rounded-3xl border border-white/5">
        <div>
          <h1 className="text-xl md:text-2xl font-black tracking-tight text-white flex items-center gap-3"><LayoutDashboard className="text-white" /> Painel Admin</h1>
          <p className="text-zinc-500 text-xs md:text-sm mt-1">Gerencie agendamentos.</p>
        </div>
        <div className="flex gap-2 w-full md:w-auto">
             <Button onClick={() => fetchBookings()} variant="outline" className="flex-1 md:flex-none border-zinc-800 bg-black/20 hover:bg-zinc-800 text-zinc-300 hover:text-white gap-2 rounded-xl"><RefreshCw size={16} /> Atualizar</Button>
            <Button onClick={handleLogout} variant="outline" className="flex-1 md:flex-none border-zinc-800 bg-black/20 hover:bg-zinc-800 text-zinc-300 hover:text-white gap-2 rounded-xl"><LogOut size={16} /> Sair</Button>
        </div>
      </header>

      <main className="relative z-10 max-w-6xl mx-auto">
        <h2 className="text-lg md:text-xl font-bold text-white mb-6">Agendamentos Recentes</h2>
        {bookings.length === 0 ? (
          <div className="text-center py-20 bg-zinc-900/30 rounded-3xl border border-white/5 backdrop-blur-sm"><CalendarDays className="mx-auto text-zinc-600 mb-4" size={40} /><p className="text-zinc-400">Nenhum agendamento.</p></div>
        ) : (
          <div className="grid gap-4 md:gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
            {bookings.map((booking, index) => (
              <motion.div key={booking.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }} className="bg-zinc-950/80 backdrop-blur-md rounded-3xl border border-white/5 overflow-hidden shadow-lg">
                <div className={`h-1.5 w-full ${booking.status === 'paid' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                <div className="p-5 md:p-6 space-y-4 md:space-y-5">
                    <div className="flex justify-between items-start">
                        <div className="overflow-hidden pr-2"><p className="text-[10px] text-zinc-500 font-bold uppercase mb-1">Serviço</p><h3 className="font-bold text-white text-base md:text-lg truncate">{booking.serviceTitle}</h3></div>
                        <span className={`shrink-0 px-2 py-1 rounded-full text-[10px] font-bold uppercase flex items-center gap-1 ${booking.status === 'paid' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'}`}>{booking.status === 'paid' ? <CheckCircle2 size={10} /> : <AlertCircle size={10} />} {booking.status === 'paid' ? 'Confirmado' : 'Pendente'}</span>
                    </div>
                    <div className="flex items-center gap-3 text-zinc-300 bg-white/5 p-3 rounded-xl border border-white/5 text-xs md:text-sm">
                        <div className="flex items-center gap-2"><CalendarDays size={14} className="text-white" /><span className="font-medium">{format(parseISO(booking.bookingDate), "dd/MM/yyyy")}</span></div><div className="w-px h-4 bg-zinc-700" /><div className="flex items-center gap-2"><Clock size={14} className="text-white" /><span className="font-medium">{booking.bookingTime}</span></div>
                    </div>
                    <div className="space-y-2">
                        <div className="flex items-center gap-3"><div className="w-6 h-6 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-400"><User size={12} /></div><div><p className="text-[10px] text-zinc-500 uppercase font-bold">Cliente</p><p className="text-white font-medium text-xs md:text-sm">{booking.clientName}</p></div></div>
                        <div className="flex items-center gap-3"><div className="w-6 h-6 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-400"><Phone size={12} /></div><div><p className="text-[10px] text-zinc-500 uppercase font-bold">Telefone</p><p className="text-zinc-300 text-xs md:text-sm">{booking.clientPhone}</p></div></div>
                    </div>
                    <div className="bg-zinc-900 p-3 md:p-4 rounded-xl text-xs md:text-sm border border-zinc-800 flex justify-between items-center">
                        <div><p className="text-zinc-500 text-[10px] uppercase font-bold">Via {booking.paymentMethod === 'PIX' ? 'Pix' : 'Cartão'}</p><p className="text-white font-bold mt-0.5">{formatCurrency(booking.pricePaid)} <span className="text-[10px] font-normal text-zinc-500">pago</span></p></div>
                        {booking.pricePending > 0 ? (<div className="text-right"><p className="text-zinc-500 text-[10px] uppercase font-bold">Falta</p><p className="text-white font-bold mt-0.5 border-b border-amber-500/50">{formatCurrency(booking.pricePending)}</p></div>) : (<div className="text-right"><p className="text-emerald-500 text-[10px] uppercase font-bold flex items-center gap-1 justify-end"><CheckCircle2 size={10}/> Pago</p></div>)}
                    </div>
                    <a href={getWhatsAppLink(booking.clientPhone, booking.clientName, booking.bookingDate, booking.bookingTime, booking.serviceTitle)} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 w-full bg-white text-black hover:bg-zinc-200 font-bold py-3 rounded-xl transition-all shadow-lg text-xs md:text-sm"><Smartphone size={16} /> WhatsApp</a>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}