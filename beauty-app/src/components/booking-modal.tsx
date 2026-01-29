"use client"

import { useState, useEffect, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogTitle, DialogTrigger, DialogClose } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { format, isValid } from "date-fns"
import { ptBR } from "date-fns/locale"
import { Wallet, Loader2, CalendarDays, Clock, AlertCircle, QrCode, CreditCard, Check, ChevronLeft, X, ArrowRight } from "lucide-react"
import { toast } from "sonner"
import { DayPicker } from "react-day-picker"
import "react-day-picker/dist/style.css"

interface BookingModalProps { 
  serviceName: string; 
  price: string; 
  children: React.ReactNode 
}

export function BookingModal({ serviceName, price, children }: BookingModalProps) {
  const [date, setDate] = useState<Date | undefined>(new Date())
  const [selectedTime, setSelectedTime] = useState<string | null>(null)
  const [step, setStep] = useState(1)
  const [open, setOpen] = useState(false)
  
  // DADOS DO CLIENTE
  const [name, setName] = useState("")
  const [phone, setPhone] = useState("")
  
  const [loading, setLoading] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState<'PIX' | 'CARD'>('PIX')
  const [acceptedTerms, setAcceptedTerms] = useState(false)

  const [busySlots, setBusySlots] = useState<string[]>([]) 
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [availableSlots, setAvailableSlots] = useState<string[]>([])
  const [config, setConfig] = useState({ porcentagemSinal: 20 })

  // Helpers
  const capitalize = (str: string) => str.charAt(0).toUpperCase() + str.slice(1)
  
  const formatPhone = (value: string) => value.replace(/\D/g, '').slice(0, 11).replace(/(\d{2})(\d)/, '($1) $2').replace(/(\d{5})(\d)/, '$1-$2').replace(/(-\d{4})\d+?$/, '$1')
  const isPhoneValid = phone.replace(/\D/g, '').length >= 10
  
  const numericPrice = useMemo(() => { 
    if (!price) return 0; 
    const c = price.replace('R$', '').trim(); 
    return parseFloat(c.includes(',') ? c.replace(/\./g, '').replace(',', '.') : c); 
  }, [price])

  const depositValue = (numericPrice * config.porcentagemSinal) / 100
  const remainingValue = numericPrice - depositValue 
  const formatMoney = (val: number) => val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

  // Resetar ao fechar
  useEffect(() => { 
      if (!open) { 
          setTimeout(() => { 
            setStep(1); 
            setSelectedTime(null); 
            setAcceptedTerms(false);
          }, 300)
      } 
  }, [open])

  useEffect(() => {
    fetch("/api/admin/config")
      .then((res) => res.json())
      .then((data) => {
        if (data && !data.error) setConfig(prev => ({ ...prev, ...data }));
      })
      .catch(() => console.log("Usando config padrão"));
  }, [])

  useEffect(() => {
    if (!date || !isValid(date)) { setBusySlots([]); setSelectedTime(null); return; }
    setLoadingSlots(true); setBusySlots([]); setSelectedTime(null); 
    
    const params = new URLSearchParams({ 
        date: format(date, "dd/MM/yyyy"), 
        service: serviceName 
    })

    fetch(`/api/availability?${params.toString()}`)
        .then(res => res.json())
        .then(data => { 
            if (data.busy) setBusySlots(data.busy)
            if (data.available) setAvailableSlots(data.available)
            setLoadingSlots(false)
        })
        .catch(() => setLoadingSlots(false))
  }, [date, serviceName])

  const handleTimeClick = (time: string) => {
    if (busySlots.includes(time)) { toast.error("Horário Indisponível"); return; }
    setSelectedTime(time)
  }

  const handleCheckout = async (paymentType: 'FULL' | 'DEPOSIT') => {
    if (!acceptedTerms) {
        toast.error("Termos de Uso", { description: "Você precisa aceitar a política de cancelamento." })
        return
    }
    if (!date || !selectedTime || !name || !isPhoneValid) {
        toast.error("Preencha seu nome e WhatsApp corretamente.")
        return 
    }
    
    setLoading(true)
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
      })
      const data = await response.json()
      if (data.error) { toast.error(data.error); return; }
      if (data.url) window.location.href = data.url 
    } catch { 
        toast.error("Erro no Servidor") 
    } finally { 
        setLoading(false) 
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      
      <DialogContent className="fixed z-50 flex flex-col gap-0 p-0 bg-[#09090b] text-white w-full h-full sm:h-auto sm:max-h-[85vh] sm:max-w-[480px] border-0 sm:border sm:border-zinc-800 rounded-none sm:rounded-3xl shadow-2xl animate-in slide-in-from-bottom-10 sm:zoom-in-95 duration-300 focus:outline-none">
        
        {/* === HEADER (FIXO) === */}
        <div className="flex-none px-5 py-4 border-b border-zinc-800 bg-[#09090b] flex justify-between items-center z-10">
            <div className="flex items-center gap-3">
                {step > 1 ? (
                   <button 
                     onClick={() => setStep(step - 1)} 
                     className="p-2 -ml-2 rounded-full hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
                     aria-label="Voltar para etapa anterior"
                   >
                      <ChevronLeft size={22} />
                   </button>
                ) : (
                   <DialogClose 
                     className="p-2 -ml-2 rounded-full hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors sm:hidden"
                     aria-label="Fechar agendamento"
                   >
                      <X size={22} />
                   </DialogClose>
                )}
                <div>
                    <DialogTitle className="text-base font-bold text-white leading-tight">
                        {step === 1 && "Escolha a Data"}
                        {step === 2 && "Seus Dados"}
                        {step === 3 && "Pagamento"}
                    </DialogTitle>
                    <p className="text-xs text-zinc-500 font-medium truncate max-w-[180px]">{serviceName}</p>
                </div>
            </div>
            <div className="bg-emerald-500/10 px-3 py-1.5 rounded-lg border border-emerald-500/20">
                <span className="text-emerald-400 font-bold text-sm">{price}</span>
            </div>
        </div>

        {/* === CORPO (ROLAGEM) === */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden p-5 custom-scrollbar bg-[#09090b]">
          
          {/* PASSO 1: CALENDÁRIO E DATA */}
          {step === 1 && (
            <div className="space-y-6 pb-24 animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="flex justify-center bg-zinc-900/40 border border-zinc-800 rounded-2xl p-2">
                  <style>{`.rdp { margin: 0; } .rdp-caption_label { text-transform: capitalize; color: white; font-weight: 700; font-size: 0.95rem; } .rdp-day_selected { background-color: white !important; color: black !important; font-weight: bold; } .rdp-day { color: #a1a1aa; font-size: 0.9rem; } .rdp-day:hover:not(.rdp-day_selected) { background-color: #27272a; } .rdp-button:hover:not([disabled]) { background-color: #27272a; }`}</style>
                  <DayPicker mode="single" selected={date} onSelect={setDate} locale={ptBR} disabled={{ before: new Date() }} />
              </div>

              {date && (
                <div className="animate-in slide-in-from-bottom-4 fade-in duration-500">
                    <Label className="mb-4 flex justify-between items-end px-1">
                        <span className="text-sm font-bold text-white flex items-center gap-2">
                            <Clock size={16} className="text-emerald-500"/> Horários Disponíveis
                        </span>
                        {loadingSlots && <Loader2 className="animate-spin w-3 h-3 text-zinc-500"/>}
                    </Label>
                    
                    <div className="grid grid-cols-4 gap-2.5">
                    {availableSlots.length > 0 ? availableSlots.map((time) => {
                        const isUnavailable = busySlots.includes(time)
                        const isSelected = selectedTime === time
                        return (
                            <button key={time} disabled={isUnavailable} onClick={() => handleTimeClick(time)}
                                className={`h-11 rounded-xl text-sm font-bold transition-all duration-200 border ${isSelected ? "bg-white text-black border-white shadow-[0_0_15px_rgba(255,255,255,0.3)] scale-[1.03]" : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:bg-zinc-800 hover:text-white hover:border-zinc-600"} ${isUnavailable ? "opacity-20 cursor-not-allowed bg-black border-transparent" : ""}`}>
                                {time}
                            </button>
                        )
                    }) : (
                        <div className="col-span-4 py-8 text-center bg-zinc-900/30 border border-dashed border-zinc-800 rounded-xl">
                            <p className="text-zinc-500 text-sm font-medium">{loadingSlots ? "Buscando horários..." : "Sem horários hoje :("}</p>
                        </div>
                    )}
                    </div>
                </div>
              )}
            </div>
          )}

          {/* PASSO 2: DADOS PESSOAIS */}
          {step === 2 && (
            <div className="space-y-6 pt-2 animate-in fade-in slide-in-from-right-8 duration-300">
                <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-2xl flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-black border border-zinc-800 flex items-center justify-center text-emerald-500 shadow-inner"><CalendarDays size={22} /></div>
                    <div>
                        <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider mb-0.5">Data Escolhida</p>
                        <p className="text-white font-bold text-lg leading-tight capitalize">
                            {date ? format(date, "dd 'de' MMMM", { locale: ptBR }) : ""}
                        </p>
                        <p className="text-zinc-400 text-sm font-medium">às {selectedTime}</p>
                    </div>
                </div>
                
                <div className="space-y-5">
                    <div className="space-y-2">
                        <Label className="text-zinc-300 text-xs font-bold uppercase ml-1">Seu Nome</Label>
                        <Input 
                            placeholder="Como prefere ser chamado?" 
                            className="bg-zinc-900 border-zinc-800 text-white h-14 text-lg px-4 rounded-xl focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 transition-all placeholder:text-zinc-600" 
                            value={name} 
                            onChange={(e) => setName(e.target.value)}
                        />
                    </div>
                    
                    <div className="space-y-2">
                        <Label className="text-zinc-300 text-xs font-bold uppercase ml-1">Seu WhatsApp</Label>
                        <Input 
                            type="tel" 
                            placeholder="(00) 00000-0000" 
                            className="bg-zinc-900 border-zinc-800 text-white h-14 text-lg px-4 rounded-xl focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 transition-all placeholder:text-zinc-600" 
                            value={phone} 
                            onChange={(e) => setPhone(formatPhone(e.target.value))} 
                            maxLength={15} 
                        />
                    </div>
                </div>
            </div>
          )}

          {/* PASSO 3: PAGAMENTO */}
          {step === 3 && (
            <div className="space-y-5 pt-1 animate-in fade-in slide-in-from-right-8 duration-300 pb-24">
                <div className="grid grid-cols-2 bg-zinc-900 p-1.5 rounded-2xl border border-zinc-800">
                    <button onClick={() => setPaymentMethod('PIX')} className={`flex flex-col sm:flex-row items-center justify-center gap-2 py-3 rounded-xl text-xs font-bold uppercase transition-all ${paymentMethod === 'PIX' ? 'bg-zinc-800 text-white shadow-sm ring-1 ring-white/10' : 'text-zinc-500 hover:text-zinc-300'}`}>
                        <QrCode size={18} className={`mb-1 sm:mb-0 ${paymentMethod === 'PIX' ? 'text-emerald-400' : ''}`}/> PIX
                    </button>
                    <button onClick={() => setPaymentMethod('CARD')} className={`flex flex-col sm:flex-row items-center justify-center gap-2 py-3 rounded-xl text-xs font-bold uppercase transition-all ${paymentMethod === 'CARD' ? 'bg-zinc-800 text-white shadow-sm ring-1 ring-white/10' : 'text-zinc-500 hover:text-zinc-300'}`}>
                        <CreditCard size={18} className={`mb-1 sm:mb-0 ${paymentMethod === 'CARD' ? 'text-blue-400' : ''}`}/> Cartão
                    </button>
                </div>

                <div onClick={() => setAcceptedTerms(!acceptedTerms)} className="bg-zinc-900/30 border border-zinc-800 rounded-2xl p-4 cursor-pointer hover:bg-zinc-900/50 transition-colors flex gap-4 items-start active:scale-[0.98]">
                    <div className={`mt-0.5 min-w-[1.25rem] h-5 rounded border flex items-center justify-center transition-colors ${acceptedTerms ? 'bg-emerald-500 border-emerald-500' : 'border-zinc-600 bg-zinc-800'}`}>
                        {acceptedTerms && <Check size={12} className="text-black stroke-[3]" />}
                    </div>
                    <div className="text-xs text-zinc-400 select-none leading-relaxed">
                        <span className="text-white font-bold block mb-0.5 flex items-center gap-1"><AlertCircle size={12} className="text-yellow-500"/> Confirmar Agendamento</span>
                        Concordo com a política de cancelamento (aviso prévio de 2h).
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-3 mt-4">
                    <button onClick={() => handleCheckout('FULL')} disabled={loading || !acceptedTerms} className={`group relative overflow-hidden flex items-center justify-between p-5 rounded-2xl border text-left transition-all active:scale-[0.98] ${!acceptedTerms ? 'opacity-50 cursor-not-allowed bg-zinc-900 border-zinc-800' : 'bg-zinc-900/50 border-zinc-700 hover:bg-zinc-800 hover:border-zinc-500'}`}>
                        <div className="flex items-center gap-4 relative z-10">
                            <div className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-400 group-hover:text-white transition-colors"><Wallet size={24} /></div>
                            <div>
                                <p className="font-bold text-white text-base">{paymentMethod === 'PIX' ? 'Pagar Total (Pix)' : 'Pagar Total (Cartão)'}</p>
                                <p className="text-xs text-zinc-500">Agendamento confirmado na hora.</p>
                            </div>
                        </div>
                        <span className="font-bold text-white text-lg relative z-10">{formatMoney(numericPrice)}</span>
                    </button>

                    <button onClick={() => handleCheckout('DEPOSIT')} disabled={loading || !acceptedTerms} className={`group relative overflow-hidden flex items-center justify-between p-5 rounded-2xl border text-left transition-all active:scale-[0.98] ${!acceptedTerms ? 'opacity-50 cursor-not-allowed bg-zinc-900 border-zinc-800' : 'bg-zinc-900/50 border-zinc-700 hover:bg-zinc-800 hover:border-zinc-500'}`}>
                        <div className="flex items-center gap-4 relative z-10">
                            <div className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-400 group-hover:text-white transition-colors"><Clock size={24} /></div>
                            <div>
                                <p className="font-bold text-white text-base">Pagar Sinal ({config.porcentagemSinal}%)</p>
                                <p className="text-xs text-zinc-500">Restante do valor no local.</p>
                            </div>
                        </div>
                        <span className="font-bold text-white text-lg relative z-10">{formatMoney(depositValue)}</span>
                    </button>
                </div>
            </div>
          )}
        </div>
        
        {/* === RODAPÉ (BOTÕES DE AÇÃO) === */}
        <div className="flex-none p-5 bg-[#09090b] border-t border-zinc-900 z-20 pb-8 sm:pb-5">
          {step === 1 && selectedTime && (
             <Button className="w-full h-14 bg-white hover:bg-zinc-200 text-black font-bold text-lg rounded-2xl shadow-lg shadow-white/10 animate-in slide-in-from-bottom-2" 
                onClick={() => setStep(2)}>
                Continuar <ArrowRight size={20} className="ml-2 opacity-50"/>
             </Button>
          )}
          
          {step === 2 && isPhoneValid && name.length > 2 && (
             <Button className="w-full h-14 bg-white hover:bg-zinc-200 text-black font-bold text-lg rounded-2xl shadow-lg shadow-white/10 animate-in slide-in-from-bottom-2" 
                onClick={() => setStep(3)}>
                Ir para Pagamento <ArrowRight size={20} className="ml-2 opacity-50"/>
             </Button>
          )}
          
          {step === 3 && (
             <div className="text-center">
                 <Button variant="ghost" onClick={() => setStep(2)} disabled={loading} className="text-zinc-500 hover:text-white text-xs uppercase tracking-widest hover:bg-transparent">
                    Voltar e editar dados
                 </Button>
             </div>
          )}
        </div>

      </DialogContent>
    </Dialog>
  )
}