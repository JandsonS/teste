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

interface BookingModalProps {
  serviceName: string
  price: string
  children: React.ReactNode
}

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

  // Resetar passos ao abrir/fechar
  useEffect(() => {
    if (!open) {
        setStep(1);
        setSelectedTime(null);
    }
  }, [open]);

  const formatPhone = (value: string) => {
    const onlyNumbers = value.replace(/\D/g, '');
    const limited = onlyNumbers.slice(0, 11);
    return limited
      .replace(/(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{5})(\d)/, '$1-$2')
      .replace(/(-\d{4})\d+?$/, '$1');
  };

  const isPhoneValid = phone.replace(/\D/g, '').length === 11;

  const numericPrice = useMemo(() => {
    if (!price) return 0;
    const cleanStr = price.replace('R$', '').trim();
    if (cleanStr.includes(',')) return parseFloat(cleanStr.replace(/\./g, '').replace(',', '.'));
    return parseFloat(cleanStr);
  }, [price]);

  const depositValue = numericPrice * 0.20 
  const remainingValue = numericPrice - depositValue 
  const formatMoney = (val: number) => val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

  const timeSlots = [
    "08:00", "08:30", "09:00", "09:30", "10:00", "10:30", 
    "11:00", "11:30", "12:00", "12:30", "13:00", "13:30", 
    "14:00", "14:30", "15:00", "15:30", "16:00", "16:30", 
    "17:00", "17:30", "18:00", "18:30", "19:00"
  ]

  useEffect(() => {
    if (!date || !isValid(date)) { 
        setBusySlots([]); 
        setLockedSlots([]);
        setSelectedTime(null); 
        return; 
    }
    const formattedDate = format(date, "dd/MM/yyyy");
    setLoadingSlots(true);
    setBusySlots([]); 
    setLockedSlots([]);
    setSelectedTime(null); 

    const params = new URLSearchParams({ date: formattedDate, service: serviceName });
    fetch(`/api/availability?${params.toString()}`)
        .then(res => res.json())
        .then(data => { 
            if (data.busy) setBusySlots(data.busy);
            if (data.locked) setLockedSlots(data.locked);
        })
        .catch(err => console.error("Erro", err))
        .finally(() => setLoadingSlots(false));
  }, [date, serviceName]);

  const handleTimeClick = (time: string) => {
    if (busySlots.includes(time)) {
        toast.error("Horário Indisponível", { 
            description: "Este horário já foi confirmado.",
        });
        return;
    }
    if (lockedSlots.includes(time)) {
        toast.error("Aguarde um momento", { 
            description: "Este horário está sendo reservado. Por favor escolha outro horário ou aguarde 2 minutos.",
            duration: 4000
        });
        return; 
    }
    setSelectedTime(time);
  };

  const handleCheckout = async (paymentType: 'FULL' | 'DEPOSIT') => {
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
          price: numericPrice, 
          paymentType: paymentType, 
          priceTotal: numericPrice,
          pricePaid: paymentType === 'FULL' ? numericPrice : depositValue,
          pricePending: paymentType === 'FULL' ? 0 : remainingValue
        }),
      });

      const data = await response.json();
      if (data.error) {
        toast.error("Atenção", { description: data.error });
        if (data.error.toLowerCase().includes("reservado")) {
            setLockedSlots(prev => [...prev, selectedTime!]);
            setSelectedTime(null);
        }
        return;
      }
      if (data.url) window.location.href = data.url; 

    } catch (error) {
      toast.error("Erro no Servidor");
    } finally {
      setLoading(false);
    }
  };

  const handleWhatsAppContact = () => {
    const number = SITE_CONFIG.whatsappNumber; 
    const msg = `Olá, gostaria de agendar um horário para *${serviceName}*...`;
    window.open(`https://wa.me/${number}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  // ESTILOS DO CALENDÁRIO (Preto e Branco Premium)
  // "text-transform: capitalize" força a primeira letra do mês a ser maiúscula
  const calendarStyles = { 
    caption: { color: '#fff', fontWeight: 'bold', textTransform: 'capitalize' as const }, 
    head_cell: { color: '#71717a' }, // zinc-500
    day: { color: '#e4e4e7' }, 
    nav_button: { color: '#fff' } 
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      
      {/* VISUAL DARK GLASS NEUTRO */}
      <DialogContent className="w-[95vw] sm:max-w-[650px] max-h-[90vh] overflow-y-auto p-0 bg-zinc-950/95 backdrop-blur-xl text-white border-zinc-800 rounded-3xl shadow-2xl shadow-black/50 scrollbar-hide">
        
        {/* CABEÇALHO CLEAN */}
        <div className="p-6 border-b border-white/5 bg-white/5">
          <DialogTitle className="text-2xl font-black tracking-tight flex items-center gap-2 text-white">
             <CalendarDays className="text-white" /> {/* Ícone Branco */}
             Agendar Horário
          </DialogTitle>
          <DialogDescription className="text-zinc-400 mt-1 flex items-center gap-2 text-sm">
            <span className="bg-white/10 px-2 py-0.5 rounded text-white font-medium">{serviceName}</span>
            <span>•</span>
            <span className="text-white font-bold">{price}</span>
          </DialogDescription>
        </div>

        <div className="p-4 md:p-6">
          {/* --- PASSO 1: ESCOLHA DE HORÁRIO --- */}
          {step === 1 && (
            <div className="flex flex-col md:flex-row gap-6">
              
              {/* Calendário */}
              <div className="flex-1 flex justify-center">
                <div className="border border-white/10 rounded-2xl p-4 bg-white/5 w-full flex justify-center backdrop-blur-sm">
                    {/* CSS Personalizado para remover o Rosa e Capitalizar o Mês */}
                    <style>{`
                      .rdp { --rdp-cell-size: 35px; --rdp-accent-color: #ffffff; --rdp-background-color: transparent; margin: 0; }
                      .rdp-caption_label { font-size: 1rem; text-transform: capitalize; }
                      .rdp-day_selected:not([disabled]) { background-color: #ffffff; color: black; font-weight: bold; border-radius: 8px; box-shadow: 0 0 15px rgba(255, 255, 255, 0.2); }
                      .rdp-day:hover:not([disabled]) { background-color: rgba(255,255,255,0.1); border-radius: 8px; }
                      .rdp-button:focus, .rdp-button:active { border: 2px solid #ffffff; }
                      @media (max-width: 400px) { .rdp { --rdp-cell-size: 30px; } }
                    `}</style>
                    <DayPicker 
                        mode="single"
                        selected={date}
                        onSelect={setDate}
                        locale={ptBR}
                        disabled={{ before: new Date() }}
                        styles={calendarStyles}
                    />
                </div>
              </div>
              
              {/* Lista de Horários */}
              <div className="flex-1">
                <Label className="mb-4 flex justify-between items-center text-white font-bold text-sm">
                    <span className="flex items-center gap-2"><Clock size={14} className="text-white"/> Horários Disponíveis</span>
                    {loadingSlots && <Loader2 className="animate-spin w-4 h-4 text-white"/>}
                </Label>
                
                <div className="grid grid-cols-4 gap-2 max-h-[280px] overflow-y-auto pr-2 custom-scrollbar">
                  {timeSlots.map((time) => {
                    const isBusy = busySlots.includes(time);
                    const isLocked = lockedSlots.includes(time);
                    const isUnavailable = isBusy || isLocked;
                    
                    return (
                        <Button 
                            key={time} 
                            variant="outline" 
                            className={`
                                text-[11px] md:text-xs h-10 font-medium transition-all border
                                ${selectedTime === time 
                                    ? "bg-white hover:bg-zinc-200 border-white text-black shadow-[0_0_15px_rgba(255,255,255,0.3)] scale-105" 
                                    : "bg-white/5 border-white/5 text-zinc-300 hover:bg-white/10 hover:border-white/20"}
                                
                                ${isUnavailable
                                    ? "opacity-30 cursor-not-allowed decoration-zinc-500 line-through bg-black/20" 
                                    : ""}
                            `} 
                            disabled={isUnavailable}
                            onClick={() => handleTimeClick(time)}
                        >
                            {time}
                        </Button>
                    )
                  })}
                </div>
              </div>
            </div>
          )}

          {/* --- PASSO 2: SEUS DADOS --- */}
          {step === 2 && (
            <div className="space-y-5 py-2 animate-in fade-in slide-in-from-right-4">
               {/* Resumo Neutro */}
               <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white font-bold">
                        <CalendarDays size={20} />
                    </div>
                    <div>
                        <p className="text-xs text-zinc-500 uppercase font-bold tracking-wider">Resumo do Agendamento</p>
                        {/* Capitalize no nome do mês aqui também */}
                        <p className="text-white font-medium capitalize">{date ? format(date, "dd 'de' MMMM", { locale: ptBR }) : ""} às {selectedTime}</p>
                    </div>
               </div>

               <div className="space-y-4">
                   <div className="space-y-2">
                     <Label className="text-zinc-300 ml-1">Seu Nome Completo</Label>
                     <div className="relative">
                        <User className="absolute left-3 top-3 text-zinc-500" size={18} />
                        <Input 
                          placeholder="Digite seu nome..." 
                          className="pl-10 bg-zinc-900 border-zinc-800 text-white focus:border-white h-12 rounded-xl placeholder:text-zinc-600 transition-colors" 
                          value={name} 
                          onChange={(e) => setName(e.target.value)}
                        />
                     </div>
                   </div>
                   <div className="space-y-2">
                     <Label className="text-zinc-300 ml-1">Seu WhatsApp</Label>
                     <div className="relative">
                        <Smartphone className="absolute left-3 top-3 text-zinc-500" size={18} />
                        <Input 
                          type="tel" 
                          placeholder="(00) 00000-0000" 
                          className="pl-10 bg-zinc-900 border-zinc-800 text-white focus:border-white h-12 rounded-xl placeholder:text-zinc-600 transition-colors" 
                          value={phone} 
                          onChange={(e) => setPhone(formatPhone(e.target.value))} 
                          maxLength={15} 
                        />
                     </div>
                     {isPhoneValid && (<p className="text-[11px] text-emerald-400 flex items-center gap-1 ml-1"><CheckCircle2 size={12} /> Número válido</p>)}
                   </div>
               </div>
            </div>
          )}

          {/* --- PASSO 3: PAGAMENTO --- */}
          {step === 3 && (
            <div className="py-2 space-y-6 animate-in fade-in slide-in-from-right-4">
                <div className="text-center">
                    <h3 className="text-lg font-bold text-white mb-4">Como deseja pagar?</h3>
                    <div className="flex gap-3 p-1 bg-zinc-900 rounded-xl border border-zinc-800">
                        <button onClick={() => setPaymentMethod('PIX')} className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg font-bold text-sm transition-all ${paymentMethod === 'PIX' ? 'bg-zinc-800 text-white border border-zinc-700 shadow-lg' : 'text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300'}`}><QrCode size={18} /> PIX</button>
                        <button onClick={() => setPaymentMethod('CARD')} className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg font-bold text-sm transition-all ${paymentMethod === 'CARD' ? 'bg-zinc-800 text-white border border-zinc-700 shadow-lg' : 'text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300'}`}><CreditCard size={18} /> Cartão</button>
                    </div>
                </div>
                
                <div className="grid grid-cols-1 gap-4">
                    {/* Botão Pagamento Total */}
                    <button onClick={() => handleCheckout('FULL')} disabled={loading} className={`relative flex items-center p-5 rounded-2xl border transition-all group disabled:opacity-50 text-left bg-zinc-900 border-zinc-800 hover:border-white/20 hover:bg-zinc-800`}>
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white shadow-lg shrink-0 mr-4 bg-zinc-700`}>
                            {paymentMethod === 'PIX' ? <Smartphone size={22} /> : <CreditCard size={22} />}
                        </div>
                        <div className="flex-1">
                            <div className="flex justify-between items-start"><p className="font-bold text-white">Pagamento Integral</p><span className="font-bold text-white">{formatMoney(numericPrice)}</span></div>
                            <p className="text-xs text-zinc-400 mt-1">Garantia imediata e sem pendências.</p>
                        </div>
                        {loading ? <Loader2 className="absolute top-5 right-5 animate-spin text-zinc-500 w-4 h-4"/> : null}
                    </button>

                    {/* Botão Sinal (20%) */}
                    <button onClick={() => handleCheckout('DEPOSIT')} disabled={loading} className={`relative flex items-center p-5 rounded-2xl border transition-all group disabled:opacity-50 text-left bg-zinc-900 border-zinc-800 hover:border-white/20 hover:bg-zinc-800`}>
                        <div className="w-12 h-12 rounded-full bg-zinc-700 flex items-center justify-center text-white shadow-lg shrink-0 mr-4"><Wallet size={22} /></div>
                        <div className="flex-1">
                            <div className="flex justify-between items-start"><p className="font-bold text-white">Sinal de Reserva (20%)</p><span className="font-bold text-white">{formatMoney(depositValue)}</span></div>
                            <p className="text-xs text-zinc-400 mt-1">Pague o restante ({formatMoney(remainingValue)}) no local.</p>
                        </div>
                        {loading ? <Loader2 className="absolute top-5 right-5 animate-spin text-zinc-500 w-4 h-4"/> : null}
                    </button>
                </div>

                <div className="text-center pt-2">
                    <button onClick={handleWhatsAppContact} className="text-xs text-zinc-500 hover:text-white transition-colors flex items-center justify-center gap-2 mx-auto hover:underline decoration-zinc-700 underline-offset-4">
                        <MessageCircle size={14} /> Problemas? Fale no WhatsApp
                    </button>
                </div>
            </div>
          )}
        </div>
        
        {/* RODAPÉ DO MODAL (Botões de Ação) */}
        <DialogFooter className="p-4 md:p-6 bg-white/5 border-t border-white/5 flex flex-col sm:flex-row gap-3">
          {step === 1 && (
            <div className="flex gap-3 w-full">
                <Button variant="ghost" onClick={() => setOpen(false)} className="flex-1 text-zinc-400 hover:text-white hover:bg-white/5 h-12 rounded-xl">Cancelar</Button>
                {/* BOTÃO PRIMÁRIO BRANCO */}
                <Button className="flex-1 bg-white hover:bg-zinc-200 text-black font-bold h-12 rounded-xl shadow-[0_0_20px_rgba(255,255,255,0.1)]" disabled={!selectedTime || !date} onClick={() => setStep(2)}>
                    Continuar
                </Button>
            </div>
          )}
          {step === 2 && (
            <div className="flex gap-3 w-full">
                <Button variant="ghost" onClick={() => setStep(1)} className="flex-1 text-zinc-400 hover:text-white hover:bg-white/5 h-12 rounded-xl">Voltar</Button>
                <Button onClick={() => setStep(3)} disabled={!name || !isPhoneValid} className="flex-1 bg-white hover:bg-zinc-200 text-black font-bold h-12 rounded-xl shadow-[0_0_20px_rgba(255,255,255,0.1)]">
                    Ir para Pagamento
                </Button>
            </div>
          )}
          {step === 3 && (
            <div className="w-full">
                <Button variant="ghost" onClick={() => setStep(2)} disabled={loading} className="w-full text-zinc-500 hover:text-white hover:bg-transparent h-10">Voltar para dados</Button>
            </div>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}