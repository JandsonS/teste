"use client"

import { useState, useEffect, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { format, isValid } from "date-fns"
import { ptBR } from "date-fns/locale"
import { CheckCircle2, Wallet, Loader2, MessageCircle, Smartphone, CreditCard, QrCode, CalendarDays, Clock, User } from "lucide-react"
import { toast } from "sonner"
import { DayPicker } from "react-day-picker"
import "react-day-picker/dist/style.css"
import { SITE_CONFIG } from "@/constants/info"

interface BookingModalProps { serviceName: string; price: string; children: React.ReactNode }

export function BookingModal({ serviceName, price, children }: BookingModalProps) {
  const [date, setDate] = useState<Date | undefined>(new Date())
  const [selectedTime, setSelectedTime] = useState<string | null>(null)
  const [step, setStep] = useState(1)
  const [open, setOpen] = useState(false)
  const [name, setName] = useState("")
  const [phone, setPhone] = useState("")
  const [loading, setLoading] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState<'PIX' | 'CARD'>('PIX')
  const [busySlots, setBusySlots] = useState<string[]>([]) 
  const [lockedSlots, setLockedSlots] = useState<string[]>([]) 
  const [loadingSlots, setLoadingSlots] = useState(false)

  useEffect(() => { if (!open) { setStep(1); setSelectedTime(null); } }, [open]);

  const formatPhone = (value: string) => value.replace(/\D/g, '').slice(0, 11).replace(/(\d{2})(\d)/, '($1) $2').replace(/(\d{5})(\d)/, '$1-$2').replace(/(-\d{4})\d+?$/, '$1');
  const isPhoneValid = phone.replace(/\D/g, '').length === 11;
  const numericPrice = useMemo(() => { if (!price) return 0; const c = price.replace('R$', '').trim(); return parseFloat(c.includes(',') ? c.replace(/\./g, '').replace(',', '.') : c); }, [price]);
  const depositValue = numericPrice * 0.20 
  const remainingValue = numericPrice - depositValue 
  const formatMoney = (val: number) => val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  const timeSlots = ["08:00", "08:30", "09:00", "09:30", "10:00", "10:30", "11:00", "11:30", "12:00", "12:30", "13:00", "13:30", "14:00", "14:30", "15:00", "15:30", "16:00", "16:30", "17:00", "17:30", "18:00", "18:30", "19:00"]

  useEffect(() => {
    if (!date || !isValid(date)) { setBusySlots([]); setLockedSlots([]); setSelectedTime(null); return; }
    setLoadingSlots(true); setBusySlots([]); setLockedSlots([]); setSelectedTime(null); 
    const params = new URLSearchParams({ date: format(date, "dd/MM/yyyy"), service: serviceName });
    fetch(`/api/availability?${params.toString()}`).then(res => res.json()).then(data => { if (data.busy) setBusySlots(data.busy); if (data.locked) setLockedSlots(data.locked); }).finally(() => setLoadingSlots(false));
  }, [date, serviceName]);

  const handleTimeClick = (time: string) => {
    if (busySlots.includes(time)) { toast.error("Horário Indisponível"); return; }
    if (lockedSlots.includes(time)) { toast.error("Aguarde um momento", { description: "Horário em reserva." }); return; }
    setSelectedTime(time);
  };

  const handleCheckout = async (paymentType: 'FULL' | 'DEPOSIT') => {
    if (!date || !selectedTime || !name || !isPhoneValid) return; 
    setLoading(true);
    try {
      const response = await fetch('/api/payment', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: serviceName, date: format(date, "dd/MM/yyyy"), time: selectedTime, clientName: name, clientPhone: phone, method: paymentMethod, price: numericPrice, paymentType, priceTotal: numericPrice, pricePaid: paymentType === 'FULL' ? numericPrice : depositValue, pricePending: paymentType === 'FULL' ? 0 : remainingValue }), });
      const data = await response.json();
      if (data.error) { toast.error("Atenção", { description: data.error }); if (data.error.includes("reservado")) { setLockedSlots(prev => [...prev, selectedTime!]); setSelectedTime(null); } return; }
      if (data.url) window.location.href = data.url; 
    } catch { toast.error("Erro no Servidor"); } finally { setLoading(false); }
  };

  const calendarStyles = { caption: { color: '#fff', fontWeight: 'bold', textTransform: 'capitalize' as const }, head_cell: { color: '#71717a' }, day: { color: '#e4e4e7' }, nav_button: { color: '#fff' } };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="w-[95vw] sm:max-w-[650px] max-h-[90vh] overflow-y-auto p-0 bg-zinc-950/95 backdrop-blur-xl text-white border-zinc-800 rounded-3xl shadow-2xl scrollbar-hide">
        <div className="p-5 md:p-6 border-b border-white/5 bg-white/5">
          <DialogTitle className="text-xl md:text-2xl font-black tracking-tight flex items-center gap-2 text-white">
             <CalendarDays className="text-white" /> Agendar Horário
          </DialogTitle>
          <DialogDescription className="text-zinc-400 mt-1 flex flex-wrap items-center gap-2 text-xs md:text-sm">
            <span className="bg-white/10 px-2 py-0.5 rounded text-white font-medium">{serviceName}</span> • <span className="text-white font-bold">{price}</span>
          </DialogDescription>
        </div>

        <div className="p-4 md:p-6">
          {step === 1 && (
            <div className="flex flex-col md:flex-row gap-6">
              <div className="flex-1 flex justify-center">
                <div className="border border-white/10 rounded-2xl p-2 md:p-4 bg-white/5 w-full flex justify-center backdrop-blur-sm">
                    <style>{`.rdp { --rdp-cell-size: 32px; --rdp-accent-color: #ffffff; --rdp-background-color: transparent; margin: 0; } .rdp-caption_label { font-size: 0.9rem; text-transform: capitalize; } .rdp-day_selected:not([disabled]) { background-color: #ffffff; color: black; font-weight: bold; border-radius: 8px; } .rdp-day:hover:not([disabled]) { background-color: rgba(255,255,255,0.1); border-radius: 8px; } .rdp-button:focus { border: 2px solid #ffffff; } @media (min-width: 640px) { .rdp { --rdp-cell-size: 40px; } }`}</style>
                    <DayPicker mode="single" selected={date} onSelect={setDate} locale={ptBR} disabled={{ before: new Date() }} styles={calendarStyles} />
                </div>
              </div>
              <div className="flex-1">
                <Label className="mb-4 flex justify-between items-center text-white font-bold text-sm">
                    <span className="flex items-center gap-2"><Clock size={14} className="text-white"/> Horários</span>
                    {loadingSlots && <Loader2 className="animate-spin w-4 h-4 text-white"/>}
                </Label>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-[180px] md:max-h-[280px] overflow-y-auto pr-2 custom-scrollbar">
                  {timeSlots.map((time) => {
                    const isUnavailable = busySlots.includes(time) || lockedSlots.includes(time);
                    return <Button key={time} variant="outline" className={`text-[10px] md:text-xs h-9 md:h-10 font-medium transition-all border ${selectedTime === time ? "bg-white text-black border-white" : "bg-white/5 border-white/5 text-zinc-300"} ${isUnavailable ? "opacity-30 cursor-not-allowed line-through bg-black/20" : ""}`} disabled={isUnavailable} onClick={() => handleTimeClick(time)}>{time}</Button>
                  })}
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-5 py-2">
               <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white"><CalendarDays size={20} /></div>
                    <div><p className="text-xs text-zinc-500 uppercase font-bold">Resumo</p><p className="text-white font-medium capitalize text-sm">{date ? format(date, "dd 'de' MMMM", { locale: ptBR }) : ""} às {selectedTime}</p></div>
               </div>
               <div className="space-y-4">
                   <div className="space-y-2"><Label className="text-zinc-300 ml-1 text-xs">Nome Completo</Label><div className="relative"><User className="absolute left-3 top-3 text-zinc-500" size={18} /><Input placeholder="Seu nome..." className="pl-10 bg-zinc-900 border-zinc-800 text-white h-11 rounded-xl placeholder:text-zinc-600" value={name} onChange={(e) => setName(e.target.value)}/></div></div>
                   <div className="space-y-2"><Label className="text-zinc-300 ml-1 text-xs">WhatsApp</Label><div className="relative"><Smartphone className="absolute left-3 top-3 text-zinc-500" size={18} /><Input type="tel" placeholder="(00) 00000-0000" className="pl-10 bg-zinc-900 border-zinc-800 text-white h-11 rounded-xl placeholder:text-zinc-600" value={phone} onChange={(e) => setPhone(formatPhone(e.target.value))} maxLength={15} /></div></div>
               </div>
            </div>
          )}

          {step === 3 && (
            <div className="py-2 space-y-4">
                <div className="flex gap-2 p-1 bg-zinc-900 rounded-xl border border-zinc-800"><button onClick={() => setPaymentMethod('PIX')} className={`flex-1 py-3 rounded-lg font-bold text-xs flex items-center justify-center gap-2 ${paymentMethod === 'PIX' ? 'bg-zinc-800 text-white border border-zinc-700' : 'text-zinc-500'}`}><QrCode size={16} /> PIX</button><button onClick={() => setPaymentMethod('CARD')} className={`flex-1 py-3 rounded-lg font-bold text-xs flex items-center justify-center gap-2 ${paymentMethod === 'CARD' ? 'bg-zinc-800 text-white border border-zinc-700' : 'text-zinc-500'}`}><CreditCard size={16} /> Cartão</button></div>
                <div className="grid grid-cols-1 gap-3">
                    <button onClick={() => handleCheckout('FULL')} disabled={loading} className="flex items-center p-4 rounded-xl border bg-zinc-900 border-zinc-800 hover:bg-zinc-800 text-left"><div className="w-10 h-10 rounded-full bg-zinc-700 flex items-center justify-center text-white mr-3"><Wallet size={18} /></div><div className="flex-1"><div className="flex justify-between"><p className="font-bold text-white text-sm">Integral</p><span className="font-bold text-white text-sm">{formatMoney(numericPrice)}</span></div><p className="text-[10px] text-zinc-400">Sem pendências.</p></div>{loading && <Loader2 className="animate-spin w-4 h-4 ml-2"/>}</button>
                    <button onClick={() => handleCheckout('DEPOSIT')} disabled={loading} className="flex items-center p-4 rounded-xl border bg-zinc-900 border-zinc-800 hover:bg-zinc-800 text-left"><div className="w-10 h-10 rounded-full bg-zinc-700 flex items-center justify-center text-white mr-3"><Wallet size={18} /></div><div className="flex-1"><div className="flex justify-between"><p className="font-bold text-white text-sm">Sinal (20%)</p><span className="font-bold text-white text-sm">{formatMoney(depositValue)}</span></div><p className="text-[10px] text-zinc-400">Restante ({formatMoney(remainingValue)}) no local.</p></div>{loading && <Loader2 className="animate-spin w-4 h-4 ml-2"/>}</button>
                </div>
            </div>
          )}
        </div>
        
        <DialogFooter className="p-4 md:p-6 bg-white/5 border-t border-white/5 flex flex-col sm:flex-row gap-3">
          {step === 1 && (<div className="flex gap-3 w-full"><Button variant="ghost" onClick={() => setOpen(false)} className="flex-1 text-zinc-400 h-10 md:h-12 rounded-xl">Cancelar</Button><Button className="flex-1 bg-white text-black font-bold h-10 md:h-12 rounded-xl" disabled={!selectedTime || !date} onClick={() => setStep(2)}>Continuar</Button></div>)}
          {step === 2 && (<div className="flex gap-3 w-full"><Button variant="ghost" onClick={() => setStep(1)} className="flex-1 text-zinc-400 h-10 md:h-12 rounded-xl">Voltar</Button><Button onClick={() => setStep(3)} disabled={!name || !isPhoneValid} className="flex-1 bg-white text-black font-bold h-10 md:h-12 rounded-xl">Pagamento</Button></div>)}
          {step === 3 && (<Button variant="ghost" onClick={() => setStep(2)} disabled={loading} className="w-full text-zinc-500 h-10">Voltar</Button>)}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}