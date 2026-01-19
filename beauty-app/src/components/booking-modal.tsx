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
  const [loadingSlots, setLoadingSlots] = useState(false)

  // --- FORMATAÇÃO E BLOQUEIO DE LETRAS ---
  const formatPhone = (value: string) => {
    // 1. Remove tudo que NÃO for número (Letras, símbolos)
    const onlyNumbers = value.replace(/\D/g, '');
    
    // 2. Limita a 11 dígitos (DDD + 9 números)
    // Se o usuário tentar colar um texto gigante, cortamos no 11º dígito.
    const limited = onlyNumbers.slice(0, 11);

    // 3. Aplica a máscara visual (XX) XXXXX-XXXX
    return limited
      .replace(/(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{5})(\d)/, '$1-$2')
      .replace(/(-\d{4})\d+?$/, '$1');
  };

  // --- VALIDAÇÃO RIGOROSA ---
  // Verifica se tem EXATAMENTE 11 números reais
  const isPhoneValid = phone.replace(/\D/g, '').length === 11;

  const numericPrice = useMemo(() => {
    if (!price) return 0;
    const cleanStr = price.replace('R$', '').trim();
    if (cleanStr.includes(',')) {
        return parseFloat(cleanStr.replace(/\./g, '').replace(',', '.'));
    }
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
        setSelectedTime(null);
        return;
    }

    const formattedDate = format(date, "dd/MM/yyyy");
    setLoadingSlots(true);
    setBusySlots([]); 
    setSelectedTime(null); 

    const params = new URLSearchParams({
        date: formattedDate,
        service: serviceName
    });

    fetch(`/api/availability?${params.toString()}`)
        .then(res => res.json())
        .then(data => {
            if (data.busy) setBusySlots(data.busy);
        })
        .catch(err => console.error("Erro ao buscar horários", err))
        .finally(() => setLoadingSlots(false));
    
  }, [date, serviceName]);

  const handleTimeClick = (time: string, isBusy: boolean) => {
    if (isBusy) {
        toast.error("Horário Indisponível", {
            description: "Este horário já foi reservado. Por favor, escolha outro horário.",
            duration: 4000,
            position: "top-center"
        });
        return;
    }
    setSelectedTime(time);
  };

  const handleCheckout = async (paymentType: 'FULL' | 'DEPOSIT') => {
    if (!date || !selectedTime || !name || !isPhoneValid) return; // Bloqueio extra aqui
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
          method: paymentMethod, 
          price: numericPrice, 
          paymentType: paymentType, 
          priceTotal: numericPrice,
          pricePaid: amountToPayNow,
          pricePending: amountPending
        }),
      });

      const data = await response.json();

      if (data.error) {
        toast.error("Atenção", { description: data.error });
        setLoading(false);
        if (data.error.toLowerCase().includes("reservado")) {
            setBusySlots(prev => [...prev, selectedTime!]);
            setSelectedTime(null);
        }
        return;
      }

      if (data.url) {
        window.location.href = data.url; 
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
                   type="tel" // Ajuda em celulares a abrir o teclado numérico
                   placeholder="(11) 99999-9999" 
                   className="bg-zinc-900 border-zinc-700 text-white focus:ring-pink-500 h-12" 
                   value={phone} 
                   onChange={(e) => setPhone(formatPhone(e.target.value))}
                   maxLength={15} // Limita visualmente
                 />
                 
                 {/* Feedback visual se o número estiver incompleto */}
                 {!isPhoneValid && phone.length > 0 && (
                   <p className="text-[10px] text-red-400 animate-pulse">
                     * Digite o número completo com DDD (11 dígitos)
                   </p>
                 )}
                 {isPhoneValid && (
                   <p className="text-[10px] text-emerald-500 flex items-center gap-1">
                     <CheckCircle2 size={10} /> Número válido
                   </p>
                 )}
               </div>
            </div>
          )}

          {step === 3 && (
            <div className="py-2 space-y-4 animate-in fade-in slide-in-from-right-4">
                
                <div className="text-center mb-4">
                    <h3 className="text-lg font-bold text-white mb-3">Escolha a forma de pagamento</h3>
                    <div className="flex gap-3 p-1 bg-zinc-900 rounded-xl border border-zinc-800">
                        <button 
                            onClick={() => setPaymentMethod('PIX')}
                            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg font-bold text-sm transition-all ${
                                paymentMethod === 'PIX' 
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/50 shadow-lg shadow-emerald-500/10' 
                                : 'text-zinc-400 hover:bg-zinc-800'
                            }`}
                        >
                            <QrCode size={18} />
                            PIX
                        </button>
                        <button 
                            onClick={() => setPaymentMethod('CARD')}
                            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg font-bold text-sm transition-all ${
                                paymentMethod === 'CARD' 
                                ? 'bg-purple-500/10 text-purple-400 border border-purple-500/50 shadow-lg shadow-purple-500/10' 
                                : 'text-zinc-400 hover:bg-zinc-800'
                            }`}
                        >
                            <CreditCard size={18} />
                            Cartão
                        </button>
                    </div>
                </div>
                
                <div className="grid grid-cols-1 gap-4">
                    
                    {/* OPÇÃO 1: PAGAMENTO INTEGRAL */}
                    <button 
                        onClick={() => handleCheckout('FULL')} 
                        disabled={loading} 
                        className={`
                            relative flex items-center p-5 rounded-2xl border-2 transition-all group disabled:opacity-50 text-left
                            ${paymentMethod === 'PIX' ? 'hover:border-emerald-500/50 hover:bg-emerald-500/5' : 'hover:border-purple-500/50 hover:bg-purple-500/5'}
                            border-zinc-800 bg-zinc-900
                        `}
                    >
                        <div className={`
                            w-14 h-14 rounded-full flex items-center justify-center text-white shadow-inner shrink-0 mr-4
                            ${paymentMethod === 'PIX' ? 'bg-emerald-500' : 'bg-purple-500'}
                        `}>
                            {paymentMethod === 'PIX' ? <Smartphone size={24} /> : <CreditCard size={24} />}
                        </div>

                        <div className="flex-1">
                            <div className="flex justify-between items-start">
                                <p className="font-bold text-white text-base">Pagamento Integral</p>
                                <span className="font-bold text-white text-base">{formatMoney(numericPrice)}</span>
                            </div>
                            <p className="text-xs text-zinc-400 mt-1">Quitação total com garantia imediata.</p>
                            
                            <div className="mt-2 flex gap-2">
                                <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${paymentMethod === 'PIX' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-purple-500/20 text-purple-400'}`}>
                                    {paymentMethod === 'PIX' ? 'Aprovação Imediata' : 'Até 12x no cartão'}
                                </span>
                            </div>
                        </div>
                        {loading ? <Loader2 className="absolute top-5 right-5 animate-spin text-zinc-500 w-4 h-4"/> : null}
                    </button>
                    
                    {/* OPÇÃO 2: SINAL (Reservar) */}
                    <button 
                        onClick={() => handleCheckout('DEPOSIT')} 
                        disabled={loading} 
                        className={`
                            relative flex items-center p-5 rounded-2xl border-2 transition-all group disabled:opacity-50 text-left
                            hover:border-blue-500/50 hover:bg-blue-500/5
                            border-zinc-800 bg-zinc-900
                        `}
                    >
                        <div className="w-14 h-14 rounded-full bg-blue-600 flex items-center justify-center text-white shadow-inner shrink-0 mr-4">
                            <Wallet size={24} />
                        </div>
                        <div className="flex-1">
                            <div className="flex justify-between items-start">
                                <p className="font-bold text-white text-base">Reservar Vaga (20%)</p>
                                <span className="font-bold text-white text-base">{formatMoney(depositValue)}</span>
                            </div>
                            <p className="text-xs text-zinc-400 mt-1">Pague o restante ({formatMoney(remainingValue)}) no local.</p>
                            
                             <div className="mt-2 flex gap-2">
                                <span className="text-[10px] px-2 py-0.5 rounded font-bold bg-blue-500/20 text-blue-400">
                                    {paymentMethod === 'PIX' ? 'Pix Rápido' : 'Crédito/Débito'}
                                </span>
                            </div>
                        </div>
                         {loading ? <Loader2 className="absolute top-5 right-5 animate-spin text-zinc-500 w-4 h-4"/> : null}
                    </button>
                </div>

                <div className="mt-4 p-4 bg-zinc-900/50 border border-zinc-800 rounded-lg flex gap-3 items-start">
                    <Info className="w-5 h-5 text-zinc-500 shrink-0 mt-0.5" />
                    <div className="text-xs text-zinc-400 leading-relaxed">
                        <p className="mb-1"><strong className="text-zinc-300">Política de Agendamento:</strong></p>
                        <p>A confirmação imediata da vaga ocorre <strong>exclusivamente</strong> via sistema. Solicitações de pagamento no local estão sujeitas à análise manual.</p>
                    </div>
                </div>

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
          
          {/* BOTÃO DO PASSO 2 (AGORA COM VALIDAÇÃO DE TELEFONE) */}
          {step === 2 && (
              <div className="flex gap-2 w-full">
                  <Button variant="outline" onClick={() => setStep(1)} className="flex-1 bg-transparent border-zinc-700 text-white hover:bg-zinc-800 h-12 rounded-xl">Voltar</Button>
                  <Button 
                    onClick={() => setStep(3)} 
                    // >>> AQUI ESTÁ O SEGREDO: Só habilita se tiver nome E telefone válido (11 dígitos)
                    disabled={!name || !isPhoneValid} 
                    className="flex-1 bg-pink-600 hover:bg-pink-700 text-white font-bold h-12 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Ir para Pagamento
                  </Button>
              </div>
          )}
          
          {step === 3 && (<div className="w-full"><Button variant="ghost" onClick={() => setStep(2)} disabled={loading} className="w-full text-zinc-500 hover:text-white mb-2 rounded-xl">Voltar</Button></div>)}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}