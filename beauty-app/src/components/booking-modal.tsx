"use client"

import { useState, useEffect, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { format, isValid } from "date-fns"
import { ptBR } from "date-fns/locale"
import { CheckCircle2, Wallet, Loader2, Info, MessageCircle, AlertTriangle, Smartphone, CreditCard, QrCode } from "lucide-react"
import { toast } from "sonner"
import { DayPicker } from "react-day-picker"
import "react-day-picker/dist/style.css"

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
            description: "Este horário está sendo reservado. Escolha outro ou aguarde 2 minutos.",
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
    const number = "5581989015555"; 
    const msg = `Olá, gostaria de agendar um horário para *${serviceName}*...`;
    window.open(`https://wa.me/${number}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      
      {/* Container Principal com Suporte a Tema Escuro e Claro */}
      <DialogContent className="w-[95vw] sm:max-w-[650px] max-h-[90vh] overflow-y-auto p-0 bg-zinc-50 dark:bg-zinc-950 text-zinc-950 dark:text-white border-zinc-200 dark:border-zinc-800 rounded-2xl scrollbar-hide transition-colors duration-300">
        
        <div className="bg-gradient-to-r from-pink-600 to-purple-700 p-4 md:p-6 text-white text-center sticky top-0 z-10 shadow-md">
          <DialogTitle className="text-xl md:text-2xl font-bold mb-1">Agendar Horário</DialogTitle>
          <DialogDescription className="text-pink-100 text-sm md:text-base">
            {serviceName} • <span className="font-bold text-white">{price}</span>
          </DialogDescription>
        </div>

        <div className="p-4 md:p-6">
          {step === 1 && (
            <div className="flex flex-col md:flex-row gap-6 md:gap-8">
              <div className="flex-1 flex justify-center">
                
                {/* Calendário: Forçando cores para garantir contraste e beleza em ambos os temas */}
                <div className="border border-zinc-200 dark:border-zinc-800 rounded-xl p-3 bg-white dark:bg-zinc-900 shadow-sm dark:shadow-inner w-full flex justify-center transition-colors">
                    <style>{`
                      .rdp { --rdp-cell-size: 35px; margin: 0; }
                      .rdp-caption_label { text-transform: capitalize; font-size: 1rem; font-weight: 700; }
                      .rdp-button:focus, .rdp-button:active { border: 2px solid #db2777; }
                      
                      /* Força a cor ROSA no selecionado (importante para não ficar azul no claro) */
                      .rdp-day_selected, .rdp-day_selected:hover { 
                        background-color: #db2777 !important; 
                        color: white !important; 
                        font-weight: bold;
                      }

                      /* Modo Escuro */
                      @media (prefers-color-scheme: dark) {
                        .rdp { --rdp-background-color: #27272a; color: #e4e4e7; }
                        .rdp-caption_label { color: white; }
                        .rdp-day:hover:not([disabled]) { background-color: #3f3f46; border-radius: 8px; }
                      }

                      /* Modo Claro */
                      @media (prefers-color-scheme: light) {
                        .rdp { --rdp-background-color: #ffffff; color: #18181b; }
                        .rdp-caption_label { color: #18181b; }
                        .rdp-day:hover:not([disabled]) { background-color: #f4f4f5; border-radius: 8px; }
                        .rdp-head_cell { color: #71717a; }
                      }
                      
                      @media (max-width: 400px) { .rdp { --rdp-cell-size: 30px; } }
                    `}</style>
                    <DayPicker 
                        mode="single"
                        selected={date}
                        onSelect={setDate}
                        locale={ptBR}
                        disabled={{ before: new Date() }}
                    />
                </div>
              </div>
              
              <div className="flex-1">
                <Label className="mb-3 flex justify-between items-center text-zinc-600 dark:text-zinc-300 font-bold text-sm md:text-base">
                    <span>2. Escolha o horário</span>
                    {loadingSlots && <Loader2 className="animate-spin w-4 h-4 text-pink-500"/>}
                </Label>
                <div className="grid grid-cols-4 gap-2 max-h-[250px] md:max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                  {timeSlots.map((time) => {
                    const isBusy = busySlots.includes(time);
                    const isLocked = lockedSlots.includes(time);
                    const isUnavailable = isBusy || isLocked;
                    
                    return (
                        <Button 
                            key={time} 
                            variant={selectedTime === time ? "default" : "outline"} 
                            className={`
                                text-[11px] md:text-xs h-9 md:h-10 font-medium transition-all
                                ${selectedTime === time 
                                    ? "bg-pink-600 hover:bg-pink-700 border-none scale-105 shadow-lg shadow-pink-900/20 text-white" 
                                    : "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"}
                                
                                ${isUnavailable
                                    ? "bg-red-50 dark:bg-red-950/10 border-red-100 dark:border-red-900/20 text-red-300 dark:text-zinc-600 line-through decoration-red-400 dark:decoration-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 opacity-70 cursor-pointer" 
                                    : ""}
                            `} 
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

          {step === 2 && (
            <div className="space-y-4 py-4 animate-in fade-in slide-in-from-right-4">
               <div className="space-y-2">
                 <Label className="text-zinc-700 dark:text-zinc-300">Seu Nome Completo</Label>
                 <Input 
                   placeholder="Ex: Maria Silva" 
                   className="bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-white focus:ring-pink-500 h-12 transition-colors" 
                   value={name} 
                   onChange={(e) => setName(e.target.value)}
                 />
               </div>
               <div className="space-y-2">
                 <Label className="text-zinc-700 dark:text-zinc-300">Seu WhatsApp</Label>
                 <Input 
                   type="tel" 
                   placeholder="(11) 99999-9999" 
                   className="bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-white focus:ring-pink-500 h-12 transition-colors" 
                   value={phone} 
                   onChange={(e) => setPhone(formatPhone(e.target.value))} 
                   maxLength={15} 
                 />
                 {!isPhoneValid && phone.length > 0 && (<p className="text-[10px] text-red-500 dark:text-red-400 animate-pulse">* Digite o número completo com DDD (11 dígitos)</p>)}
                 {isPhoneValid && (<p className="text-[10px] text-emerald-600 dark:text-emerald-500 flex items-center gap-1"><CheckCircle2 size={10} /> Número válido</p>)}
               </div>
            </div>
          )}

          {step === 3 && (
            <div className="py-2 space-y-4 animate-in fade-in slide-in-from-right-4">
                <div className="text-center mb-4">
                    <h3 className="text-lg font-bold text-zinc-900 dark:text-white mb-3">Escolha a forma de pagamento</h3>
                    <div className="flex gap-3 p-1 bg-zinc-100 dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 transition-colors">
                        <button onClick={() => setPaymentMethod('PIX')} className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg font-bold text-sm transition-all ${paymentMethod === 'PIX' ? 'bg-emerald-100 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/50 shadow-sm' : 'text-zinc-500 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-800'}`}><QrCode size={18} /> PIX</button>
                        <button onClick={() => setPaymentMethod('CARD')} className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg font-bold text-sm transition-all ${paymentMethod === 'CARD' ? 'bg-purple-100 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-500/50 shadow-sm' : 'text-zinc-500 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-800'}`}><CreditCard size={18} /> Cartão</button>
                    </div>
                </div>
                
                <div className="grid grid-cols-1 gap-4">
                    <button onClick={() => handleCheckout('FULL')} disabled={loading} className={`relative flex items-center p-5 rounded-2xl border-2 transition-all group disabled:opacity-50 text-left ${paymentMethod === 'PIX' ? 'hover:border-emerald-500/50 hover:bg-emerald-50' : 'hover:border-purple-500/50 hover:bg-purple-50'} border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900`}>
                        <div className={`w-14 h-14 rounded-full flex items-center justify-center text-white shadow-inner shrink-0 mr-4 ${paymentMethod === 'PIX' ? 'bg-emerald-500' : 'bg-purple-500'}`}>{paymentMethod === 'PIX' ? <Smartphone size={24} /> : <CreditCard size={24} />}</div>
                        <div className="flex-1">
                            <div className="flex justify-between items-start"><p className="font-bold text-zinc-900 dark:text-white text-base">Pagamento Integral</p><span className="font-bold text-zinc-900 dark:text-white text-base">{formatMoney(numericPrice)}</span></div>
                            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">Quitação total com garantia imediata.</p>
                            <div className="mt-2 flex gap-2"><span className={`text-[10px] px-2 py-0.5 rounded font-bold ${paymentMethod === 'PIX' ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400' : 'bg-purple-100 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400'}`}>{paymentMethod === 'PIX' ? 'Aprovação Imediata' : 'Até 12x no cartão'}</span></div>
                        </div>
                        {loading ? <Loader2 className="absolute top-5 right-5 animate-spin text-zinc-500 w-4 h-4"/> : null}
                    </button>

                    <button onClick={() => handleCheckout('DEPOSIT')} disabled={loading} className={`relative flex items-center p-5 rounded-2xl border-2 transition-all group disabled:opacity-50 text-left hover:border-blue-500/50 hover:bg-blue-50 border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900`}>
                        <div className="w-14 h-14 rounded-full bg-blue-600 flex items-center justify-center text-white shadow-inner shrink-0 mr-4"><Wallet size={24} /></div>
                        <div className="flex-1">
                            <div className="flex justify-between items-start"><p className="font-bold text-zinc-900 dark:text-white text-base">Reservar Vaga (20%)</p><span className="font-bold text-zinc-900 dark:text-white text-base">{formatMoney(depositValue)}</span></div>
                            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">Pague o restante ({formatMoney(remainingValue)}) no local.</p>
                        </div>
                        {loading ? <Loader2 className="absolute top-5 right-5 animate-spin text-zinc-500 w-4 h-4"/> : null}
                    </button>
                </div>

                <div className="text-center pt-2">
                    <div className="flex items-center justify-center gap-1 text-[10px] text-yellow-600/80 mb-1"><AlertTriangle size={10} /><span>Atendimento sujeito a espera</span></div>
                    <button onClick={handleWhatsAppContact} className="text-xs text-zinc-500 hover:text-green-500 transition-colors flex items-center justify-center gap-2 mx-auto underline decoration-zinc-400 dark:decoration-zinc-700 underline-offset-4 hover:decoration-green-500"><MessageCircle size={14} />Não consegue pagar online? Solicitar via WhatsApp</button>
                </div>
            </div>
          )}
        </div>
        
        <DialogFooter className="p-4 md:p-6 bg-zinc-50 dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-800 flex flex-col sm:flex-row gap-2 transition-colors">
          {step === 1 && (
            <div className="flex gap-2 w-full">
                {/* >>> AQUI ESTÁ O BOTÃO DE VOLTAR QUE VOCÊ PEDIU <<< */}
                <Button variant="outline" onClick={() => setOpen(false)} className="flex-1 bg-transparent border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 h-12 rounded-xl">Voltar</Button>
                <Button className="flex-1 bg-pink-600 hover:bg-pink-700 text-white font-bold h-12 rounded-xl" disabled={!selectedTime || !date} onClick={() => setStep(2)}>Continuar</Button>
            </div>
          )}
          
          {step === 2 && (<div className="flex gap-2 w-full"><Button variant="outline" onClick={() => setStep(1)} className="flex-1 bg-transparent border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 h-12 rounded-xl">Voltar</Button><Button onClick={() => setStep(3)} disabled={!name || !isPhoneValid} className="flex-1 bg-pink-600 hover:bg-pink-700 text-white font-bold h-12 rounded-xl disabled:opacity-50">Ir para Pagamento</Button></div>)}
          {step === 3 && (<div className="w-full"><Button variant="ghost" onClick={() => setStep(2)} disabled={loading} className="w-full text-zinc-500 hover:text-zinc-900 dark:hover:text-white mb-2 rounded-xl">Voltar</Button></div>)}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}