"use client"

import { useState, useEffect, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { format, isValid } from "date-fns"
import { ptBR } from "date-fns/locale"
import { Wallet, Loader2, CalendarDays, Clock, AlertCircle, QrCode, CreditCard, Check } from "lucide-react"
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

  // Helper para Maiúscula
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

  useEffect(() => { 
      if (!open) { 
          setStep(1); 
          setSelectedTime(null); 
          setAcceptedTerms(false);
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
      <DialogContent className="w-[95vw] sm:max-w-[500px] max-h-[90vh] overflow-y-auto p-0 bg-[#09090b] border-zinc-800 text-white rounded-3xl shadow-2xl animate-in fade-in zoom-in-95">
        
        {/* Header */}
        <div className="p-5 border-b border-zinc-800 bg-zinc-900/50 flex justify-between items-center">
            <div>
                <DialogTitle className="text-lg font-bold text-white flex items-center gap-2">
                    Agendar Horário
                </DialogTitle>
                <div className="flex items-center gap-2 text-zinc-400 text-xs mt-1">
                    <span className="bg-zinc-800 px-2 py-0.5 rounded text-white font-medium border border-zinc-700">{serviceName}</span>
                </div>
            </div>
            <div className="text-emerald-400 font-bold text-lg">{price}</div>
        </div>

        <div className="p-5">
          {/* PASSO 1: Data e Hora */}
          {step === 1 && (
            <div className="flex flex-col gap-6">
              <div className="border border-zinc-800 rounded-2xl p-4 bg-zinc-900/30 flex justify-center">
                  <style>{`.rdp-caption_label { text-transform: capitalize !important; color: white; font-weight: bold; } .rdp-day_selected { background-color: white !important; color: black !important; }`}</style>
                  <DayPicker mode="single" selected={date} onSelect={setDate} locale={ptBR} disabled={{ before: new Date() }} className="m-0" />
              </div>

              <div>
                <Label className="mb-3 flex justify-between items-center text-white font-bold text-sm">
                    <span className="flex items-center gap-2"><Clock size={16}/> Horários Disponíveis</span>
                    {loadingSlots && <Loader2 className="animate-spin w-4 h-4"/>}
                </Label>
                
                <div className="grid grid-cols-4 gap-2 max-h-[200px] overflow-y-auto pr-1 custom-scrollbar">
                  {availableSlots.length > 0 ? availableSlots.map((time) => {
                    const isUnavailable = busySlots.includes(time)
                    const isSelected = selectedTime === time
                    return (
                        <button key={time} disabled={isUnavailable} onClick={() => handleTimeClick(time)}
                            className={`text-xs font-medium h-9 rounded-lg border transition-all ${isSelected ? "bg-white text-black border-white shadow-lg scale-105" : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:bg-zinc-800 hover:text-white"} ${isUnavailable ? "opacity-20 cursor-not-allowed bg-black decoration-zinc-700" : ""}`}>
                            {time}
                        </button>
                    )
                  }) : (
                      <div className="col-span-4 text-center py-4 text-zinc-500 text-xs italic">
                          {loadingSlots ? "Carregando..." : "Nenhum horário disponível."}
                      </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* PASSO 2: Dados do Cliente */}
          {step === 2 && (
            <div className="space-y-5 py-2">
                <div className="bg-zinc-900/50 border border-zinc-800 p-4 rounded-xl flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center text-white"><CalendarDays size={18} /></div>
                    <div>
                        <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider">Data Selecionada</p>
                        <p className="text-white font-medium text-sm">
                            {/* AQUI ESTA A CORREÇÃO DA MAIUSCULA */}
                            {date ? (
                              <>
                                {format(date, "dd 'de' ", { locale: ptBR })}
                                {capitalize(format(date, "MMMM", { locale: ptBR }))}
                              </>
                            ) : ""} às {selectedTime}
                        </p>
                    </div>
                </div>
                
                <div className="space-y-4">
                    <div className="space-y-1.5">
                        <Label className="text-zinc-400 text-xs font-bold uppercase ml-1">Nome Completo</Label>
                        <Input placeholder="Seu nome..." className="bg-zinc-950 border-zinc-800 text-white h-11 rounded-xl focus-visible:ring-emerald-500" value={name} onChange={(e) => setName(e.target.value)}/>
                    </div>
                    
                    <div className="space-y-1.5">
                        <Label className="text-zinc-400 text-xs font-bold uppercase ml-1">WhatsApp</Label>
                        <Input type="tel" placeholder="(00) 00000-0000" className="bg-zinc-950 border-zinc-800 text-white h-11 rounded-xl focus-visible:ring-emerald-500" value={phone} onChange={(e) => setPhone(formatPhone(e.target.value))} maxLength={15} />
                    </div>
                </div>
            </div>
          )}

          {/* PASSO 3: Pagamento */}
          {step === 3 && (
            <div className="py-1 space-y-4">
                <div className="grid grid-cols-2 bg-zinc-900 p-1 rounded-xl border border-zinc-800">
                    <button onClick={() => setPaymentMethod('PIX')} className={`flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold uppercase transition-all ${paymentMethod === 'PIX' ? 'bg-zinc-800 text-white shadow-sm ring-1 ring-white/10' : 'text-zinc-500 hover:text-zinc-300'}`}>
                        <QrCode size={16} className={paymentMethod === 'PIX' ? 'text-emerald-400' : ''}/> PIX
                    </button>
                    <button onClick={() => setPaymentMethod('CARD')} className={`flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold uppercase transition-all ${paymentMethod === 'CARD' ? 'bg-zinc-800 text-white shadow-sm ring-1 ring-white/10' : 'text-zinc-500 hover:text-zinc-300'}`}>
                        <CreditCard size={16} className={paymentMethod === 'CARD' ? 'text-blue-400' : ''}/> Cartão
                    </button>
                </div>

                <div onClick={() => setAcceptedTerms(!acceptedTerms)} className="bg-zinc-900/30 border border-zinc-800 rounded-xl p-3 cursor-pointer hover:bg-zinc-900/50 transition-colors flex gap-3">
                    <div className={`mt-0.5 min-w-[1.25rem] h-5 rounded border flex items-center justify-center transition-colors ${acceptedTerms ? 'bg-emerald-500 border-emerald-500' : 'border-zinc-600 bg-zinc-800'}`}>
                        {acceptedTerms && <Check size={12} className="text-black stroke-[3]" />}
                    </div>
                    <div className="text-xs text-zinc-400 select-none">
                        <span className="text-white font-bold block mb-1 flex items-center gap-1"><AlertCircle size={10} className="text-yellow-500"/> Política de Agendamento</span>
                        Concordo com os termos. Cancelamentos com 2h de antecedência.
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-3 mt-2">
                    <button onClick={() => handleCheckout('FULL')} disabled={loading || !acceptedTerms} className={`group flex items-center justify-between p-4 rounded-xl border text-left transition-all ${!acceptedTerms ? 'opacity-50 cursor-not-allowed bg-zinc-900 border-zinc-800' : 'bg-zinc-900/50 border-zinc-700 hover:bg-zinc-800 hover:border-zinc-500'}`}>
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-400 group-hover:text-white transition-colors"><Wallet size={18} /></div>
                            <div>
                                <p className="font-bold text-white text-sm">{paymentMethod === 'PIX' ? 'Pagar Tudo no Pix' : 'Pagar Tudo no Cartão'}</p>
                                <p className="text-[10px] text-zinc-500">Sem filas no local.</p>
                            </div>
                        </div>
                        <span className="font-bold text-white text-sm">{formatMoney(numericPrice)}</span>
                    </button>

                    <button onClick={() => handleCheckout('DEPOSIT')} disabled={loading || !acceptedTerms} className={`group flex items-center justify-between p-4 rounded-xl border text-left transition-all ${!acceptedTerms ? 'opacity-50 cursor-not-allowed bg-zinc-900 border-zinc-800' : 'bg-zinc-900/50 border-zinc-700 hover:bg-zinc-800 hover:border-zinc-500'}`}>
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-400 group-hover:text-white transition-colors"><Clock size={18} /></div>
                            <div>
                                <p className="font-bold text-white text-sm">Sinal de Reserva ({config.porcentagemSinal}%)</p>
                                <p className="text-[10px] text-zinc-500">Restante no estabelecimento.</p>
                            </div>
                        </div>
                        <span className="font-bold text-white text-sm">{formatMoney(depositValue)}</span>
                    </button>
                </div>
            </div>
          )}
        </div>
        
        <DialogFooter className="p-4 bg-zinc-950 border-t border-zinc-900 flex flex-col sm:flex-row gap-2">
          {step === 1 && (
             <div className="flex gap-2 w-full">
                 <Button variant="ghost" onClick={() => setOpen(false)} className="flex-1 text-zinc-500 hover:text-white hover:bg-zinc-900">Cancelar</Button>
                 <Button className="flex-1 bg-white text-black hover:bg-zinc-200 font-bold" disabled={!selectedTime || !date} onClick={() => setStep(2)}>Continuar</Button>
             </div>
          )}
          {step === 2 && (
             <div className="flex gap-2 w-full">
                 <Button variant="ghost" onClick={() => setStep(1)} className="flex-1 text-zinc-500 hover:text-white hover:bg-zinc-900">Voltar</Button>
                 <Button onClick={() => setStep(3)} disabled={!name || !isPhoneValid} className="flex-1 bg-white text-black hover:bg-zinc-200 font-bold">Ir para Pagamento</Button>
             </div>
          )}
          {step === 3 && (
             <Button variant="ghost" onClick={() => setStep(2)} disabled={loading} className="w-full text-zinc-500 hover:text-white text-xs uppercase tracking-widest">Voltar para dados</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}