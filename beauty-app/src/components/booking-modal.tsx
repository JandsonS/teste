"use client"

import { useState, useEffect } from "react"
import { Calendar } from "@/components/ui/calendar"
import { Button } from "@/components/ui/button"
import {
  Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { format, isValid } from "date-fns"
import { ptBR } from "date-fns/locale"
import { CheckCircle2, CreditCard, MapPin, Loader2, Info } from "lucide-react" 
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
        toast.error("Atenção", { 
            description: data.error,
            duration: 6000,
            position: "top-center"
        });
        setLoading(false);
        
        if (data.error.includes("horário") || data.error.includes("ocupado")) {
            setBusySlots(prev => [...prev, selectedTime!]);
            setSelectedTime(null);
        }
        return;
      }

      if (data.url) {
        window.location.href = data.url; 
      } else if (data.success) {
        if (method === 'LOCAL') {
            toast.success("Solicitação Enviada!", {
                description: "Aguarde a confirmação via WhatsApp.",
            });
        } else {
            toast.success("Agendamento Confirmado!", {
                description: "Seu horário está garantido.",
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

  const calendarStyles = {
    caption: { color: '#e4e4e7', textTransform: 'capitalize' }, // Garante letra maiúscula via style inline tbm
    head_cell: { color: '#a1a1aa' },
    day: { color: '#e4e4e7' },
    nav_button: { color: '#ec4899' },
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      
      {/* RESPONSIVIDADE: 
         - w-[95vw]: No mobile ocupa 95% da largura.
         - max-h-[90vh]: Altura máxima de 90% da tela para não cortar em celulares pequenos.
         - overflow-y-auto: Permite rolar se o conteúdo for grande.
      */}
      <DialogContent className="w-[95vw] sm:max-w-[650px] max-h-[90vh] overflow-y-auto p-0 bg-zinc-950 text-white border-zinc-800 rounded-2xl scrollbar-hide">
        
        <div className="bg-gradient-to-r from-pink-600 to-purple-700 p-4 md:p-6 text-white text-center sticky top-0 z-10 shadow-md">
          <DialogTitle className="text-xl md:text-2xl font-bold mb-1">Agendar Horário</DialogTitle>
          <DialogDescription className="text-pink-100 text-sm md:text-base">
            {serviceName} • <span className="font-bold text-white">{price}</span>
          </DialogDescription>
        </div>

        <div className="p-4 md:p-6">
          {step === 1 && (
            // Flex-col no mobile (um embaixo do outro) e Flex-row no Desktop (lado a lado)
            <div className="flex flex-col md:flex-row gap-6 md:gap-8">
              
              {/* CALENDÁRIO */}
              <div className="flex-1 flex justify-center">
                <div className="border border-zinc-800 rounded-xl p-3 bg-zinc-900 shadow-inner w-full flex justify-center">
                    <style>{`
                      .rdp { --rdp-cell-size: 35px; --rdp-accent-color: #db2777; --rdp-background-color: #27272a; margin: 0; }
                      /* Regra para Maiúscula no Mês */
                      .rdp-caption_label { text-transform: capitalize; font-size: 1rem; font-weight: 700; color: white; }
                      .rdp-day_selected:not([disabled]) { background-color: #db2777; color: white; font-weight: bold; }
                      .rdp-day:hover:not([disabled]) { background-color: #3f3f46; border-radius: 8px; }
                      .rdp-button:focus, .rdp-button:active { border: 2px solid #db2777; }
                      /* Ajuste mobile para células menores */
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
              
              {/* GRADE DE HORÁRIOS */}
              <div className="flex-1">
                <Label className="mb-3 flex justify-between items-center text-zinc-300 font-bold text-sm md:text-base">
                    <span>2. Escolha o horário</span>
                    {loadingSlots && <Loader2 className="animate-spin w-4 h-4 text-pink-500"/>}
                </Label>
                
                {/* Grid ajustado para mobile: 4 colunas é padrão, mas ajusta o tamanho da fonte */}
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
                
                {selectedTime && date && (
                    <div className="mt-4 p-3 bg-pink-500/10 border border-pink-500/20 rounded-lg text-pink-400 text-xs md:text-sm flex items-center animate-in fade-in slide-in-from-top-2">
                        <CheckCircle2 className="w-4 h-4 mr-2 shrink-0"/>
                        <span>Confirmando: <strong>{format(date, "dd/MM", { locale: ptBR })} às {selectedTime}</strong></span>
                    </div>
                )}
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
                <div className="text-center mb-4"><h3 className="text-lg font-bold text-white">Como deseja finalizar?</h3></div>
                <div className="grid grid-cols-1 gap-3">
                    <button onClick={() => handleCheckout('ONLINE')} disabled={loading} className="flex items-center justify-between p-4 rounded-xl border border-pink-500/30 bg-pink-500/10 hover:bg-pink-500/20 transition group disabled:opacity-50 text-left">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-pink-500 flex items-center justify-center text-white shadow-lg shadow-pink-500/20 shrink-0">
                                <CreditCard size={20} />
                            </div>
                            <div>
                                <p className="font-bold text-white text-sm">Pagar Online (Garantido)</p>
                                <p className="text-xs text-pink-200/70">Vaga confirmada na hora.</p>
                            </div>
                        </div>
                        {loading ? <Loader2 className="animate-spin text-pink-500"/> : <div className="w-4 h-4 rounded-full border border-zinc-600 group-hover:border-pink-500"></div>}
                    </button>
                    
                    <button onClick={() => handleCheckout('LOCAL')} disabled={loading} className="flex items-center justify-between p-4 rounded-xl border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 transition group disabled:opacity-50 text-left">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500 shrink-0">
                                <MapPin size={20} />
                            </div>
                            <div>
                                <p className="font-bold text-white text-sm">Pagar no Local</p>
                                <p className="text-xs text-zinc-500">Sujeito a confirmação.</p>
                            </div>
                        </div>
                         {loading ? <Loader2 className="animate-spin text-blue-500"/> : <div className="w-4 h-4 rounded-full border border-zinc-600 group-hover:border-blue-500"></div>}
                    </button>
                </div>
                <div className="mt-4 p-4 bg-zinc-900/80 border border-zinc-800 rounded-lg flex gap-3 items-start">
                    <Info className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
                    <div className="text-xs md:text-sm text-zinc-400 leading-relaxed">
                        <p className="mb-2"><strong className="text-white">Política de Reservas:</strong></p>
                        <ul className="list-disc pl-4 space-y-1">
                            <li><strong>Online:</strong> Garante a vaga imediatamente.</li>
                            <li><strong>No Local:</strong> É apenas uma solicitação. Aguarde contato.</li>
                        </ul>
                    </div>
                </div>
            </div>
          )}
        </div>
        
        {/* FOOTER FIXO */}
        <DialogFooter className="p-4 md:p-6 bg-zinc-900 border-t border-zinc-800 flex flex-col sm:flex-row gap-2">
          {step === 1 && (<Button className="w-full bg-pink-600 hover:bg-pink-700 text-white font-bold h-12 rounded-xl" disabled={!selectedTime || !date} onClick={() => setStep(2)}>Continuar</Button>)}
          {step === 2 && (<div className="flex gap-2 w-full"><Button variant="outline" onClick={() => setStep(1)} className="flex-1 bg-transparent border-zinc-700 text-white hover:bg-zinc-800 h-12 rounded-xl">Voltar</Button><Button onClick={() => setStep(3)} disabled={!name || !phone} className="flex-1 bg-pink-600 hover:bg-pink-700 text-white font-bold h-12 rounded-xl">Ir para Pagamento</Button></div>)}
          {step === 3 && (<div className="w-full"><Button variant="ghost" onClick={() => setStep(2)} disabled={loading} className="w-full text-zinc-500 hover:text-white mb-2 rounded-xl">Voltar</Button></div>)}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}