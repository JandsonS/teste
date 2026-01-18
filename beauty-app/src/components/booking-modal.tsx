"use client"

import { useState, useEffect, useMemo } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { format, isValid } from "date-fns"
import { ptBR } from "date-fns/locale"
import { CheckCircle2, CreditCard, Wallet, Loader2, Info, MessageCircle, AlertTriangle } from "lucide-react"
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
  
  const [busySlots, setBusySlots] = useState<string[]>([])
  const [loadingSlots, setLoadingSlots] = useState(false)

  // --- LÓGICA FINANCEIRA CORRIGIDA ---
  const numericPrice = useMemo(() => {
    if (!price) return 0;
    const cleanStr = price.replace('R$', '').trim();
    
    // Se tiver vírgula, assume formato BR (1.000,00)
    if (cleanStr.includes(',')) {
        return parseFloat(cleanStr.replace(/\./g, '').replace(',', '.'));
    }
    // Se não, assume formato numérico simples ou US (1.00)
    return parseFloat(cleanStr);
  }, [price]);

  const depositValue = numericPrice * 0.20 
  const remainingValue = numericPrice - depositValue 

  const formatMoney = (val: number) => val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

  // GRADE DE HORÁRIOS
  const timeSlots = [
    "08:00", "08:30", "09:00", "09:30", "10:00", "10:30", 
    "11:00", "11:30", "12:00", "12:30", "13:00", "13:30", 
    "14:00", "14:30", "15:00", "15:30", "16:00", "16:30", 
    "17:00", "17:30", "18:00", "18:30", "19:00"
  ]

  useEffect(() => {
    if (!date || !isValid(date)) {
        setBusySlots([]);
        setSelectedTime(null);
        return;
    }

    const formattedDate = format(date, "dd/MM/yyyy");
    setLoadingSlots(true);
    setBusySlots([]); 
    setSelectedTime(null); 

    fetch(`/api/availability?date=${formattedDate}`)
        .then(res => res.json())
        .then(data => {
            if (data.busy) setBusySlots(data.busy);
        })
        .catch(err => console.error("Erro ao buscar horários", err))
        .finally(() => setLoadingSlots(false));
    
  }, [date]);

  const handleTimeClick = (time: string, isBusy: boolean) => {
    if (isBusy) {
        toast.error("Horário Indisponível", {
            description: "Este horário já foi reservado. Por favor, escolha outro horário.",
            duration: 6000,
            position: "top-center"
        });
        return;
    }
    setSelectedTime(time);
  };

  const handleCheckout = async (paymentType: 'FULL' | 'DEPOSIT') => {
    if (!date || !selectedTime || !name) return;
    setLoading(true);

    const amountToPayNow = paymentType === 'FULL' ? numericPrice : depositValue;
    const amountPending = paymentType === 'FULL' ? 0 : remainingValue;

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
          // MANTÉM COMPATIBILIDADE: Envia o 'price' antigo E os novos campos
          price: numericPrice, 
          paymentType: paymentType, 
          priceTotal: numericPrice,
          pricePaid: amountToPayNow,
          pricePending: amountPending
        }),
      });

      const data = await response.json();

      if (data.error) {
        // Se o erro vier da API
        toast.error("Atenção", { description: data.error });
        setLoading(false);
        
        // Atualiza slots se o erro for de conflito
        if (data.error.toLowerCase().includes("horário") || data.error.toLowerCase().includes("ocupado")) {
            setBusySlots(prev => [...prev, selectedTime!]);
            setSelectedTime(null);
        }
        return;
      }

      if (data.url) {
        window.location.href = data.url; 
      } else if (data.success) {
         toast.success("Agendamento Iniciado!", { description: "Redirecionando..." });
        setOpen(false);
        setTimeout(() => { setStep(1); setSelectedTime(null); setName(""); }, 500);
      }

    } catch (error) {
      console.error(error);
      toast.error("Erro no Servidor", { description: "Não foi possível conectar ao sistema de pagamento." });
    } finally {
      setLoading(false);
    }
  };

  const handleWhatsAppContact = () => {
    const number = "5581989015555"; 
    const msg = `Olá, gostaria de agendar um horário para *${serviceName}* (Data sugerida: ${date ? format(date, "dd/MM") : 'a combinar'} às ${selectedTime}) e realizar o pagamento no local. Aguardo confirmação.`;
    window.open(`https://wa.me/${number}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  const calendarStyles = {
    caption: { color: '#e4e4e7', textTransform: 'capitalize' as const },
    head_cell: { color: '#a1a1aa' },
    day: { color: '#e4e4e7' },
    nav_button: { color: '#ec4899' },
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      
      <DialogContent className="w-[95vw] sm:max-w-[650px] max-h-[90vh] overflow-y-auto p-0 bg-zinc-950 text-white border-zinc-800 rounded-2xl scrollbar-hide">
        
        <div className="bg-gradient-to-r from-pink-600 to-purple-700 p-4 md:p-6 text-white text-center sticky top-0 z-10 shadow-md">
          <DialogTitle className="text-xl md:text-2xl font-bold mb-1">Agendar Horário</DialogTitle>
          <DialogDescription className="text-pink-100 text-sm md:text-base">
            {serviceName} • <span className="font-bold text-white">{price}</span>
          </DialogDescription>
        </div>

        <div className="p-4 md:p-6">
          {step === 1 && (
            <div className="flex flex-col md:flex-row gap-6 md:gap-8">
              {/* CALENDÁRIO */}
              <div className="flex-1 flex justify-center">
                <div className="border border-zinc-800 rounded-xl p-3 bg-zinc-900 shadow-inner w-full flex justify-center">
                    <style>{`
                      .rdp { --rdp-cell-size: 35px; --rdp-accent-color: #db2777; --rdp-background-color: #27272a; margin: 0; }
                      .rdp-caption_label { text-transform: capitalize; font-size: 1rem; font-weight: 700; color: white; }
                      .rdp-day_selected:not([disabled]) { background-color: #db2777; color: white; font-weight: bold; }
                      .rdp-day:hover:not([disabled]) { background-color: #3f3f46; border-radius: 8px; }
                      .rdp-button:focus, .rdp-button:active { border: 2px solid #db2777; }
                      @media (max-width: 400px) { .rdp { --rdp-cell-size: 30px; } }
                    `}</style>
                    <DayPicker 
                        mode="single"
                        selected={date}
                        onSelect={setDate}
                        locale={ptBR}
                        disabled={{ before: new Date() }}
                        styles={calendarStyles}
                        modifiersClassNames={{
                            selected: "bg-pink-600 text-white rounded-md",
                            today: "text-pink-500 font-bold"
                        }}
                    />
                </div>
              </div>
              
              <div className="flex-1">
                <Label className="mb-3 flex justify-between items-center text-zinc-300 font-bold text-sm md:text-base">
                    <span>2. Escolha o horário</span>
                    {loadingSlots && <Loader2 className="animate-spin w-4 h-4 text-pink-500"/>}
                </Label>
                <div className="grid grid-cols-4 gap-2 max-h-[250px] md:max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                  {timeSlots.map((time) => {
                    const isBusy = busySlots.includes(time);
                    return (
                        <Button 
                            key={time} 
                            variant={selectedTime === time ? "default" : "outline"} 
                            className={`
                                text-[11px] md:text-xs h-9 md:h-10 font-medium transition-all
                                ${selectedTime === time 
                                    ? "bg-pink-600 hover:bg-pink-700 border-none scale-105 shadow-lg shadow-pink-900/20" 
                                    : "bg-zinc-900 border-zinc-800 text-zinc-300 hover:bg-zinc-800 hover:border-zinc-700"}
                                
                                ${isBusy 
                                    ? "bg-red-950/10 border-red-900/20 text-zinc-600 line-through decoration-red-500 hover:bg-red-950/20 opacity-70" 
                                    : ""}
                            `} 
                            onClick={() => handleTimeClick(time, isBusy)}
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
                 <Label className="text-zinc-300">Seu Nome Completo</Label>
                 <Input 
                   placeholder="Ex: Maria Silva" 
                   className="bg-zinc-900 border-zinc-700 text-white focus:ring-pink-500 h-12" 
                   value={name} 
                   onChange={(e) => setName(e.target.value)}
                 />
               </div>
               <div className="space-y-2">
                 <Label className="text-zinc-300">Seu WhatsApp</Label>
                 <Input 
                   placeholder="(11) 99999-9999" 
                   className="bg-zinc-900 border-zinc-700 text-white focus:ring-pink-500 h-12" 
                   value={phone} 
                   onChange={(e) => setPhone(e.target.value)}
                 />
               </div>
            </div>
          )}

          {step === 3 && (
            <div className="py-2 space-y-4 animate-in fade-in slide-in-from-right-4">
                <div className="text-center mb-4"><h3 className="text-lg font-bold text-white">Garantia de Vaga</h3></div>
                
                <div className="grid grid-cols-1 gap-3">
                    
                    {/* OPÇÃO 1: PAGAMENTO INTEGRAL */}
                    <button onClick={() => handleCheckout('FULL')} disabled={loading} className="flex items-center justify-between p-4 rounded-xl border border-pink-500/30 bg-pink-500/10 hover:bg-pink-500/20 transition group disabled:opacity-50 text-left">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-pink-500 flex items-center justify-center text-white shadow-lg shadow-pink-500/20 shrink-0">
                                <CreditCard size={20} />
                            </div>
                            <div>
                                <p className="font-bold text-white text-sm">Pagamento Integral ({formatMoney(numericPrice)})</p>
                                <p className="text-xs text-pink-200/70">Quitação total do serviço com garantia imediata de atendimento.</p>
                            </div>
                        </div>
                        {loading ? <Loader2 className="animate-spin text-pink-500"/> : <div className="w-4 h-4 rounded-full border border-zinc-600 group-hover:border-pink-500"></div>}
                    </button>
                    
                    {/* OPÇÃO 2: SINAL (Reservar) */}
                    <button onClick={() => handleCheckout('DEPOSIT')} disabled={loading} className="flex items-center justify-between p-4 rounded-xl border border-blue-500/30 bg-blue-500/10 hover:bg-blue-500/20 transition group disabled:opacity-50 text-left">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400 shrink-0">
                                <Wallet size={20} />
                            </div>
                            <div>
                                <p className="font-bold text-white text-sm">Pague 20% do serviço para reservar sua vaga ({formatMoney(depositValue)})</p>
                                <p className="text-xs text-zinc-400">Restante de {formatMoney(remainingValue)} a pagar no local.</p>
                            </div>
                        </div>
                         {loading ? <Loader2 className="animate-spin text-blue-500"/> : <div className="w-4 h-4 rounded-full border border-zinc-600 group-hover:border-blue-500"></div>}
                    </button>
                </div>

                {/* POLÍTICA */}
                <div className="mt-2 p-4 bg-zinc-900/80 border border-zinc-800 rounded-lg flex gap-3 items-start">
                    <Info className="w-5 h-5 text-zinc-500 shrink-0 mt-0.5" />
                    <div className="text-xs text-zinc-400 leading-relaxed">
                        <p className="mb-1"><strong className="text-zinc-300">Política de Agendamento:</strong></p>
                        <p>A confirmação imediata da vaga ocorre <strong>exclusivamente</strong> mediante pagamento (Integral ou Sinal) via sistema. Solicitações de pagamento no local estão sujeitas à análise manual.</p>
                    </div>
                </div>

                {/* BOTÃO WHATSAPP */}
                <div className="text-center pt-2">
                   <div className="flex items-center justify-center gap-1 text-[10px] text-yellow-600/80 mb-1">
                      <AlertTriangle size={10} />
                      <span>Atendimento sujeito a espera</span>
                   </div>
                   
                   <button 
                     onClick={handleWhatsAppContact}
                     className="text-xs text-zinc-500 hover:text-green-500 transition-colors flex items-center justify-center gap-2 mx-auto underline decoration-zinc-700 underline-offset-4 hover:decoration-green-500"
                   >
                     <MessageCircle size={14} />
                     Não consegue pagar online? Solicitar via WhatsApp
                   </button>
                </div>
            </div>
          )}
        </div>
        
        <DialogFooter className="p-4 md:p-6 bg-zinc-900 border-t border-zinc-800 flex flex-col sm:flex-row gap-2">
          {step === 1 && (<Button className="w-full bg-pink-600 hover:bg-pink-700 text-white font-bold h-12 rounded-xl" disabled={!selectedTime || !date} onClick={() => setStep(2)}>Continuar</Button>)}
          {step === 2 && (<div className="flex gap-2 w-full"><Button variant="outline" onClick={() => setStep(1)} className="flex-1 bg-transparent border-zinc-700 text-white hover:bg-zinc-800 h-12 rounded-xl">Voltar</Button><Button onClick={() => setStep(3)} disabled={!name || !phone} className="flex-1 bg-pink-600 hover:bg-pink-700 text-white font-bold h-12 rounded-xl">Ir para Pagamento</Button></div>)}
          {step === 3 && (<div className="w-full"><Button variant="ghost" onClick={() => setStep(2)} disabled={loading} className="w-full text-zinc-500 hover:text-white mb-2 rounded-xl">Voltar</Button></div>)}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}