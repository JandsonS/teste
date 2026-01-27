"use client"

import { useState, useEffect, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { format, isValid, isToday } from "date-fns"
import { ptBR } from "date-fns/locale"
import { Wallet, Loader2, Smartphone, CreditCard, QrCode, CalendarDays, Clock, User, AlertCircle } from "lucide-react"
import { toast } from "sonner"
import { DayPicker } from "react-day-picker"
import "react-day-picker/dist/style.css"

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
  const [acceptedTerms, setAcceptedTerms] = useState(false)

  const [busySlots, setBusySlots] = useState<string[]>([]) 
  const [lockedSlots, setLockedSlots] = useState<string[]>([]) 
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);

  // Função para deixar a primeira letra maiúscula (ex: Janeiro)
  const capitalize = (str: string) => str.charAt(0).toUpperCase() + str.slice(1);

  useEffect(() => { 
      if (!open) { 
          setStep(1); 
          setSelectedTime(null); 
          setAcceptedTerms(false);
      } 
  }, [open]);

  const formatPhone = (value: string) => value.replace(/\D/g, '').slice(0, 11).replace(/(\d{2})(\d)/, '($1) $2').replace(/(\d{5})(\d)/, '$1-$2').replace(/(-\d{4})\d+?$/, '$1');
  const isPhoneValid = phone.replace(/\D/g, '').length === 11;
  const numericPrice = useMemo(() => { if (!price) return 0; const c = price.replace('R$', '').trim(); return parseFloat(c.includes(',') ? c.replace(/\./g, '').replace(',', '.') : c); }, [price]);
  const depositValue = numericPrice * 0.20 
  const remainingValue = numericPrice - depositValue 
  const formatMoney = (val: number) => val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

  useEffect(() => {
    if (!date || !isValid(date)) { setBusySlots([]); setLockedSlots([]); setSelectedTime(null); return; }
    setLoadingSlots(true); setBusySlots([]); setLockedSlots([]); setSelectedTime(null); 
    
    const params = new URLSearchParams({ 
        date: format(date, "dd/MM/yyyy"), 
        service: serviceName 
    });

    fetch(`/api/availability?${params.toString()}`)
        .then(res => res.json())
        .then(data => { 
            if (data.busy) setBusySlots(data.busy); 
            if (data.available) setAvailableSlots(data.available); 
            setLoadingSlots(false);
        })
        .catch(() => setLoadingSlots(false));
  }, [date, serviceName]);

  const handleTimeClick = (time: string) => {
    if (busySlots.includes(time)) { toast.error("Horário Indisponível"); return; }
    setSelectedTime(time);
  };

  const handleCheckout = async (paymentType: 'FULL' | 'DEPOSIT') => {
    if (!acceptedTerms) {
        toast.error("Termos de Uso", { description: "Você precisa aceitar a política de cancelamento." });
        return;
    }
    if (!date || !selectedTime || !name || !isPhoneValid) return; 
    setLoading(true);
    try {
      const response = await fetch('/api/payment', { 
          method: 'POST', 
          headers: { 'Content-Type': 'application/json' }, 
          body: JSON.stringify({ 
              title: serviceName, 
              date: format(date, "dd/MM/yyyy"), 
              time: selectedTime, 
              clientName: name, 
              clientPhone: phone, 
              method: paymentMethod, 
              paymentType, 
              pricePaid: paymentType === 'FULL' ? numericPrice : depositValue, 
              pricePending: paymentType === 'FULL' ? 0 : remainingValue 
          }), 
      });
      const data = await response.json();
      if (data.error) { toast.error(data.error); return; }
      if (data.url) window.location.href = data.url; 
    } catch { toast.error("Erro no Servidor"); } finally { setLoading(false); }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="w-[95vw] sm:max-w-[650px] max-h-[90vh] overflow-y-auto p-0 bg-zinc-950/95 backdrop-blur-xl text-white border-zinc-800 rounded-3xl shadow-2xl">
        
        <div className="p-5 md:p-6 border-b border-white/10 bg-white/5">
          <DialogTitle className="text-xl md:text-2xl font-black tracking-tight flex items-center gap-2 text-white">
             <CalendarDays className="text-white" /> Agendar Horário
          </DialogTitle>
          <DialogDescription className="text-zinc-400 mt-1 flex flex-wrap items-center gap-2 text-xs md:text-sm">
            <span className="bg-zinc-800 px-2 py-0.5 rounded text-white font-medium border border-zinc-700">{serviceName}</span> • <span className="text-emerald-400 font-bold">{price}</span>
          </DialogDescription>
        </div>

        <div className="p-4 md:p-6">
          {step === 1 && (
            <div className="flex flex-col md:flex-row gap-6">
              <div className="flex-1 flex justify-center">
                <div className="border border-zinc-800 rounded-2xl p-4 bg-zinc-900/50 w-full flex justify-center">
                    <style>{`
                      .rdp-caption_label { text-transform: capitalize !important; color: white; font-weight: bold; }
                    `}</style>
                    <DayPicker mode="single" selected={date} onSelect={setDate} locale={ptBR} disabled={{ before: new Date() }} />
                </div>
              </div>

              <div className="flex-1">
                <Label className="mb-4 flex justify-between items-center text-white font-bold text-sm">
                    <span className="flex items-center gap-2"><Clock size={16} className="text-white"/> Horários Disponíveis</span>
                    {loadingSlots && <Loader2 className="animate-spin w-4 h-4 text-white"/>}
                </Label>
                
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-[280px] overflow-y-auto pr-1">
                  {availableSlots.map((time) => {
                    const isUnavailable = busySlots.includes(time);
                    const isSelected = selectedTime === time;
                    return (
                        <button key={time} disabled={isUnavailable} onClick={() => handleTimeClick(time)}
                            className={`text-xs md:text-sm h-10 rounded-xl border transition-all ${isSelected ? "bg-white text-black border-white" : "bg-zinc-900 border-zinc-800 text-zinc-300 hover:bg-zinc-800"} ${isUnavailable ? "opacity-25 cursor-not-allowed line-through bg-black" : ""}`}>
                            {time}
                        </button>
                    )
                  })}
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-5 py-2">
                <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white"><CalendarDays size={20} /></div>
                    <div>
                        <p className="text-xs text-zinc-500 uppercase font-bold">Resumo</p>
                        <p className="text-white font-medium text-sm">
                            {/* ✅ DATA CAPITALIZADA AQUI */}
                            {date ? capitalize(format(date, "dd 'de' MMMM", { locale: ptBR })) : ""} às {selectedTime}
                        </p>
                    </div>
                </div>
                <div className="space-y-4">
                    <div className="space-y-2"><Label className="text-zinc-300 ml-1 text-xs">Nome Completo</Label><Input placeholder="Seu nome..." className="bg-zinc-900 border-zinc-800 text-white h-11 rounded-xl" value={name} onChange={(e) => setName(e.target.value)}/></div>
                    <div className="space-y-2"><Label className="text-zinc-300 ml-1 text-xs">WhatsApp</Label><Input type="tel" placeholder="(00) 00000-0000" className="bg-zinc-900 border-zinc-800 text-white h-11 rounded-xl" value={phone} onChange={(e) => setPhone(formatPhone(e.target.value))} maxLength={15} /></div>
                </div>
            </div>
          )}

          {step === 3 && (
            <div className="py-2 space-y-4">
                {/* --- SEÇÃO DE TERMOS COM LINK PARA WHATSAPP --- */}
<div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4">
    <div className="flex items-start gap-3">
        <input 
            type="checkbox" 
            id="terms" 
            checked={acceptedTerms} 
            onChange={(e) => setAcceptedTerms(e.target.checked)} 
            className="w-4 h-4 rounded border-zinc-600 bg-zinc-800 accent-emerald-500 mt-1 cursor-pointer" 
        />
        <label htmlFor="terms" className="text-xs text-zinc-400 cursor-pointer select-none">
            <span className="text-white font-bold block mb-1 flex items-center gap-1">
                <AlertCircle size={10} className="text-yellow-500"/> Política de Agendamento
            </span>
            Concordo que o não comparecimento sem aviso prévio implica na perda do sinal. 
            Remarcações devem ser feitas com 2h de antecedência via 
            <a 
                href="https://wa.me/5581989015555?text=Olá, gostaria de solicitar uma remarcação/cancelamento." 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-emerald-500 font-bold underline ml-1 hover:text-emerald-400"
            >
                WhatsApp clicando aqui.
            </a>
        </label>
    </div>
</div>

<div className="grid grid-cols-1 gap-3 mt-4">
    {/* BOTAO PAGAMENTO INTEGRAL */}
    <button 
        onClick={() => handleCheckout('FULL')} 
        disabled={loading || !acceptedTerms}
        className={`group flex items-center p-4 rounded-xl border text-left transition-all ${!acceptedTerms ? 'opacity-50 grayscale cursor-not-allowed' : 'bg-zinc-900 border-zinc-800 hover:bg-zinc-800'}`}
    >
        <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center mr-3">
            <Wallet size={18} />
        </div>
        <div className="flex-1">
            <div className="flex justify-between mb-1">
                <p className="font-bold text-white text-sm">Pagamento Antecipado</p>
                <span className="font-bold text-white text-sm">{formatMoney(numericPrice)}</span>
            </div>
            <p className="text-[10px] text-zinc-400">Pague agora e evite filas no local.</p>
        </div>
        {loading && <Loader2 className="animate-spin w-4 h-4 ml-2"/>}
    </button>

    {/* BOTAO GARANTIR VAGA (SINAL) */}
    <button 
        onClick={() => handleCheckout('DEPOSIT')} 
        disabled={loading || !acceptedTerms}
        className={`group flex items-center p-4 rounded-xl border text-left transition-all ${!acceptedTerms ? 'opacity-50 grayscale cursor-not-allowed' : 'bg-zinc-900 border-zinc-800 hover:bg-zinc-800'}`}
    >
        <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center mr-3">
            <Wallet size={18} />
        </div>
        <div className="flex-1">
            <div className="flex justify-between mb-1">
                <p className="font-bold text-white text-sm">Garantir Vaga (Sinal 20%)</p>
                <span className="font-bold text-white text-sm">{formatMoney(depositValue)}</span>
            </div>
            <p className="text-[10px] text-zinc-400">Pague apenas o sinal para confirmar seu horário.</p>
        </div>
        {loading && <Loader2 className="animate-spin w-4 h-4 ml-2"/>}
        </button>
                </div>
            </div>
          )}
        </div>
        
        <DialogFooter className="p-4 md:p-6 bg-white/5 border-t border-white/5 flex flex-col sm:flex-row gap-3">
          {step === 1 && (<div className="flex gap-3 w-full"><Button variant="ghost" onClick={() => setOpen(false)} className="flex-1 text-zinc-400 rounded-xl">Cancelar</Button><Button className="flex-1 bg-white text-black font-bold rounded-xl" disabled={!selectedTime || !date} onClick={() => setStep(2)}>Continuar</Button></div>)}
          {step === 2 && (<div className="flex gap-3 w-full"><Button variant="ghost" onClick={() => setStep(1)} className="flex-1 text-zinc-400 rounded-xl">Voltar</Button><Button onClick={() => setStep(3)} disabled={!name || !isPhoneValid} className="flex-1 bg-white text-black font-bold rounded-xl">Pagamento</Button></div>)}
          {step === 3 && (<Button variant="ghost" onClick={() => setStep(2)} disabled={loading} className="w-full text-zinc-500 h-10">Voltar</Button>)}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}