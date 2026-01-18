"use client"

import { useState, useEffect } from "react"
import { Calendar } from "@/components/ui/calendar"
import { Button } from "@/components/ui/button"
import {
  Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
// Adicionei o ícone AlertCircle aqui
import { CheckCircle2, CreditCard, MapPin, Loader2, AlertCircle } from "lucide-react" 
import { toast } from "sonner"

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

  const timeSlots = ["09:00", "09:30", "10:00", "10:30", "11:00", "11:30", "12:00", "12:30", "13:00", "13:30", "14:00", "14:30", "15:00", "15:30", "16:00", "16:30", "17:00", "17:30", "18:00", "18:30"]

  useEffect(() => {
    if (date) {
        const formattedDate = format(date, "dd/MM/yyyy");
        setLoadingSlots(true);
        setBusySlots([]); 
        setSelectedTime(null); 

        fetch(`/api/availability?date=${formattedDate}`)
            .then(res => res.json())
            .then(data => {
                if (data.busy) {
                    setBusySlots(data.busy);
                }
            })
            .catch(err => console.error("Erro ao buscar horários", err))
            .finally(() => setLoadingSlots(false));
    }
  }, [date]);

  const handleCheckout = async (method: 'ONLINE' | 'LOCAL') => {
    if (!date || !selectedTime || !name) return;
    setLoading(true);

    try {
      const response = await fetch('/api/payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: serviceName,
          price: parseFloat(price.replace('R$', '').replace(',', '.').trim()),
          date: format(date, "dd/MM/yyyy"),
          time: selectedTime,
          clientName: name,
          method: method
        }),
      });

      const data = await response.json();

      if (data.error) {
        toast.error("Atenção", { description: data.error });
        setLoading(false);
        if (data.error.includes("horário") || data.error.includes("ocupado")) {
            setBusySlots(prev => [...prev, selectedTime]);
            setSelectedTime(null);
        }
        return;
      }

      if (data.url) {
        window.location.href = data.url; 
      } else if (data.success) {
        if (method === 'LOCAL') {
            toast.success("Solicitação Recebida! 📩", {
                description: "Aguarde a confirmação final do estabelecimento via WhatsApp.",
                duration: 6000,
            });
        } else {
            toast.success("Agendamento Confirmado! 🎉", {
                description: "Vaga garantida com sucesso.",
            });
        }
        
        setOpen(false);
        setTimeout(() => { setStep(1); setSelectedTime(null); setName(""); }, 500);
      }

    } catch (error) {
      console.error(error);
      toast.error("Erro ao processar");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[600px] p-0 overflow-hidden bg-zinc-950 text-white border-zinc-800 rounded-2xl">
        <div className="bg-gradient-to-r from-pink-600 to-purple-700 p-6 text-white text-center">
          <DialogTitle className="text-2xl font-bold mb-1">Agendar Horário</DialogTitle>
          <DialogDescription className="text-pink-100">{serviceName} • <span className="font-bold text-white">{price}</span></DialogDescription>
        </div>
        <div className="p-6">
          {step === 1 && (
            <div className="flex flex-col md:flex-row gap-6">
              <div className="flex-1">
                <Label className="mb-3 block text-zinc-300">1. Escolha o dia</Label>
                <div className="border border-zinc-800 rounded-xl p-2 bg-zinc-900">
                  <Calendar mode="single" selected={date} onSelect={setDate} locale={ptBR} className="rounded-md text-zinc-300" disabled={(date) => date < new Date() || date.getDay() === 0} />
                </div>
              </div>
              <div className="flex-1">
                <Label className="mb-3 flex justify-between items-center text-zinc-300">
                    <span>2. Escolha o horário</span>
                    {loadingSlots && <Loader2 className="animate-spin w-4 h-4 text-pink-500"/>}
                </Label>
                
                <div className="grid grid-cols-4 gap-2">
                  {timeSlots.map((time) => {
                    const isBusy = busySlots.includes(time);
                    return (
                        <Button 
                            key={time} 
                            disabled={isBusy} 
                            variant={selectedTime === time ? "default" : "outline"} 
                            className={`
                                ${selectedTime === time ? "bg-pink-600 hover:bg-pink-700 border-none" : "bg-transparent border-zinc-700 hover:bg-zinc-800 text-zinc-300"}
                                ${isBusy ? "opacity-30 cursor-not-allowed line-through bg-zinc-900 border-zinc-800 text-zinc-600" : ""}
                            `} 
                            onClick={() => !isBusy && setSelectedTime(time)}
                        >
                            {time}
                        </Button>
                    )
                  })}
                </div>
                {selectedTime && (<div className="mt-6 p-3 bg-pink-500/10 border border-pink-500/20 rounded-lg text-pink-400 text-sm flex items-center"><CheckCircle2 className="w-4 h-4 mr-2"/>Selecionado: <strong>{format(date!, "dd/MM", { locale: ptBR })} às {selectedTime}</strong></div>)}
              </div>
            </div>
          )}
          {step === 2 && (
            <div className="space-y-4 py-4 animate-in fade-in slide-in-from-right-4">
               <div className="space-y-2"><Label className="text-zinc-300">Seu Nome Completo</Label><Input placeholder="Ex: Maria Silva" className="bg-zinc-900 border-zinc-700 text-white focus:ring-pink-500" value={name} onChange={(e) => setName(e.target.value)}/></div>
               <div className="space-y-2"><Label className="text-zinc-300">Seu WhatsApp</Label><Input placeholder="(11) 99999-9999" className="bg-zinc-900 border-zinc-700 text-white focus:ring-pink-500" value={phone} onChange={(e) => setPhone(e.target.value)}/></div>
            </div>
          )}
          {step === 3 && (
            <div className="py-4 space-y-4 animate-in fade-in slide-in-from-right-4">
                <div className="text-center mb-6"><h3 className="text-lg font-bold text-white">Como deseja finalizar?</h3></div>
                
                <div className="grid grid-cols-1 gap-3">
                    {/* Botão Online */}
                    <button onClick={() => handleCheckout('ONLINE')} disabled={loading} className="flex items-center justify-between p-4 rounded-xl border border-pink-500/30 bg-pink-500/10 hover:bg-pink-500/20 transition group disabled:opacity-50 text-left">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-pink-500 flex items-center justify-center text-white shadow-lg shadow-pink-500/20">
                                <CreditCard size={20} />
                            </div>
                            <div>
                                <p className="font-bold text-white text-sm">Pagar Online (Recomendado)</p>
                                <p className="text-xs text-pink-200/70">Confirmação automática e vaga garantida.</p>
                            </div>
                        </div>
                        {loading ? <Loader2 className="animate-spin text-pink-500"/> : <div className="w-4 h-4 rounded-full border border-zinc-600 group-hover:border-pink-500"></div>}
                    </button>
                    
                    {/* Botão Local */}
                    <button onClick={() => handleCheckout('LOCAL')} disabled={loading} className="flex items-center justify-between p-4 rounded-xl border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 transition group disabled:opacity-50 text-left">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500">
                                <MapPin size={20} />
                            </div>
                            <div>
                                <p className="font-bold text-white text-sm">Pagar no Local</p>
                                <p className="text-xs text-zinc-500">Sujeito a análise e confirmação manual.</p>
                            </div>
                        </div>
                         {loading ? <Loader2 className="animate-spin text-blue-500"/> : <div className="w-4 h-4 rounded-full border border-zinc-600 group-hover:border-blue-500"></div>}
                    </button>
                </div>

                {/* --- AQUI ESTÁ A NOVA MENSAGEM CLARA E PROFISSIONAL --- */}
                <div className="mt-6 p-4 bg-zinc-900/80 border border-zinc-800 rounded-lg flex gap-3 items-start">
                    <AlertCircle className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
                    <div className="text-sm text-zinc-400 leading-relaxed">
                        <p className="mb-2"><strong className="text-white">Política de Reservas:</strong></p>
                        <ul className="list-disc pl-4 space-y-1">
                            <li><strong>Pagamento Online:</strong> Sua vaga é garantida imediatamente.</li>
                            <li><strong>Pagamento no Local:</strong> É uma solicitação. Aguarde a confirmação da nossa equipe via WhatsApp.</li>
                        </ul>
                    </div>
                </div>

            </div>
          )}
        </div>
        <DialogFooter className="p-6 bg-zinc-900 border-t border-zinc-800">
          {step === 1 && (<Button className="w-full bg-pink-600 hover:bg-pink-700 text-white font-bold h-12" disabled={!selectedTime || !date} onClick={() => setStep(2)}>Continuar</Button>)}
          {step === 2 && (<div className="flex gap-2 w-full"><Button variant="outline" onClick={() => setStep(1)} className="flex-1 bg-transparent border-zinc-700 text-white hover:bg-zinc-800">Voltar</Button><Button onClick={() => setStep(3)} disabled={!name || !phone} className="flex-1 bg-pink-600 hover:bg-pink-700 text-white font-bold">Ir para Pagamento</Button></div>)}
          {step === 3 && (<div className="w-full"><Button variant="ghost" onClick={() => setStep(2)} disabled={loading} className="w-full text-zinc-500 hover:text-white mb-2">Voltar</Button></div>)}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}