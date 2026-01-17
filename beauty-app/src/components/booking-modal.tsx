"use client"

import { useState } from "react"
import { Calendar } from "@/components/ui/calendar"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { CheckCircle2, CreditCard, MapPin, Loader2 } from "lucide-react"
import { toast } from "sonner"

interface BookingModalProps {
  serviceName: string
  price: string
  children: React.ReactNode
}

export function BookingModal({ serviceName, price, children }: BookingModalProps) {
  const [date, setDate] = useState<Date | undefined>(new Date())
  const [selectedTime, setSelectedTime] = useState<string | null>(null)
  const [step, setStep] = useState(1) // 1 = Data/Hora, 2 = Dados, 3 = Pagamento
  const [open, setOpen] = useState(false)
  
  // Estados do Formulário
  const [name, setName] = useState("")
  const [phone, setPhone] = useState("")
  const [loading, setLoading] = useState(false)

  const timeSlots = ["09:00", "10:00", "11:00", "14:00", "15:00", "16:30", "18:00"]

  const handleCheckout = async (method: 'ONLINE' | 'LOCAL') => {
    if (!date || !selectedTime || !name) return;

    setLoading(true);

    try {
      // 1. Envia para a nossa API
      const response = await fetch('/api/payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
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
        toast.error("Ops!", { description: data.error });
        setLoading(false);
        return;
      }

      // 🚨 MUDANÇA CRUCIAL AQUI 🚨
      // Agora verificamos se veio um paymentId (para o Brick)
      if (data.paymentId) {
        // Redireciona para a nossa página interna do Pix com Brick
        window.location.href = `/pix?paymentId=${data.paymentId}`;
      } 
      // Ou se foi sucesso local
      else if (data.success) {
        toast.success("Agendamento Confirmado! 🎉", {
          description: "Te aguardamos no local e horário combinado.",
          duration: 5000,
        });
        setOpen(false);
        setTimeout(() => {
          setStep(1); setSelectedTime(null); setName("");
        }, 500);
      }

    } catch (error) {
      console.error(error);
      toast.error("Erro ao processar", { description: "Tente novamente mais tarde." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] p-0 overflow-hidden bg-zinc-950 text-white border-zinc-800 rounded-2xl">
        <div className="bg-gradient-to-r from-pink-600 to-purple-700 p-6 text-white text-center">
          <DialogTitle className="text-2xl font-bold mb-1">Agendar Horário</DialogTitle>
          <DialogDescription className="text-pink-100">
            {serviceName} • <span className="font-bold text-white">{price}</span>
          </DialogDescription>
        </div>

        <div className="p-6">
          {/* PASSO 1: DATA E HORA */}
          {step === 1 && (
            <div className="flex flex-col md:flex-row gap-6">
              <div className="flex-1">
                <Label className="mb-3 block font-bold text-zinc-300">1. Escolha o dia</Label>
                <div className="border border-zinc-800 rounded-xl p-2 bg-zinc-900">
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={setDate}
                    locale={ptBR}
                    className="rounded-md text-zinc-300"
                    disabled={(date) => date < new Date() || date.getDay() === 0}
                  />
                </div>
              </div>

              <div className="flex-1">
                <Label className="mb-3 block font-bold text-zinc-300">2. Escolha o horário</Label>
                <div className="grid grid-cols-2 gap-2">
                  {timeSlots.map((time) => (
                    <Button
                      key={time}
                      variant={selectedTime === time ? "default" : "outline"}
                      className={selectedTime === time 
                        ? "bg-pink-600 hover:bg-pink-700 border-none" 
                        : "bg-transparent border-zinc-700 hover:bg-zinc-800 text-zinc-300"}
                      onClick={() => setSelectedTime(time)}
                    >
                      {time}
                    </Button>
                  ))}
                </div>
                {selectedTime && (
                  <div className="mt-6 p-3 bg-pink-500/10 border border-pink-500/20 rounded-lg text-pink-400 text-sm flex items-center">
                    <CheckCircle2 className="w-4 h-4 mr-2"/>
                    Selecionado: <strong>{format(date!, "dd/MM", { locale: ptBR })} às {selectedTime}</strong>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* PASSO 2: DADOS DO CLIENTE */}
          {step === 2 && (
            <div className="space-y-4 py-4 animate-in fade-in slide-in-from-right-4">
               <div className="space-y-2">
                 <Label className="text-zinc-300">Seu Nome Completo</Label>
                 <Input 
                    placeholder="Ex: Maria Silva" 
                    className="bg-zinc-900 border-zinc-700 text-white focus:ring-pink-500" 
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                 />
               </div>
               <div className="space-y-2">
                 <Label className="text-zinc-300">Seu WhatsApp</Label>
                 <Input 
                    placeholder="(11) 99999-9999" 
                    className="bg-zinc-900 border-zinc-700 text-white focus:ring-pink-500" 
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                 />
               </div>
            </div>
          )}

          {/* PASSO 3: PAGAMENTO */}
          {step === 3 && (
            <div className="py-4 space-y-4 animate-in fade-in slide-in-from-right-4">
                <div className="text-center mb-6">
                    <h3 className="text-lg font-bold text-white">Como você prefere pagar?</h3>
                    <p className="text-zinc-400 text-sm">Escolha a melhor opção para confirmar sua reserva.</p>
                </div>

                <div className="grid grid-cols-1 gap-3">
                    <button 
                        onClick={() => handleCheckout('ONLINE')}
                        disabled={loading}
                        className="flex items-center justify-between p-4 rounded-xl border border-zinc-700 bg-zinc-900 hover:bg-zinc-800 transition group disabled:opacity-50"
                    >
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-pink-500/10 flex items-center justify-center text-pink-500 group-hover:text-pink-400">
                                <CreditCard size={20} />
                            </div>
                            <div className="text-left">
                                <p className="font-bold text-white">Pagar Agora (Pix/Cartão)</p>
                                <p className="text-xs text-zinc-500">Confirmação imediata via Mercado Pago</p>
                            </div>
                        </div>
                        {loading ? <Loader2 className="animate-spin text-pink-500"/> : <div className="w-4 h-4 rounded-full border border-zinc-600 group-hover:border-pink-500"></div>}
                    </button>

                    <button 
                         onClick={() => handleCheckout('LOCAL')}
                         disabled={loading}
                         className="flex items-center justify-between p-4 rounded-xl border border-zinc-700 bg-zinc-900 hover:bg-zinc-800 transition group disabled:opacity-50"
                    >
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500 group-hover:text-blue-400">
                                <MapPin size={20} />
                            </div>
                            <div className="text-left">
                                <p className="font-bold text-white">Pagar no Local</p>
                                <p className="text-xs text-zinc-500">Agende agora e pague no estabelecimento</p>
                            </div>
                        </div>
                         {loading ? <Loader2 className="animate-spin text-blue-500"/> : <div className="w-4 h-4 rounded-full border border-zinc-600 group-hover:border-blue-500"></div>}
                    </button>
                </div>
            </div>
          )}
        </div>

        <DialogFooter className="p-6 bg-zinc-900 border-t border-zinc-800">
          {step === 1 && (
            <Button 
                className="w-full bg-pink-600 hover:bg-pink-700 text-white font-bold h-12"
                disabled={!selectedTime || !date}
                onClick={() => setStep(2)}
            >
                Continuar
            </Button>
          )}

          {step === 2 && (
             <div className="flex gap-2 w-full">
                <Button variant="outline" onClick={() => setStep(1)} className="flex-1 bg-transparent border-zinc-700 text-white hover:bg-zinc-800">Voltar</Button>
                <Button 
                    onClick={() => setStep(3)} 
                    disabled={!name || !phone}
                    className="flex-1 bg-pink-600 hover:bg-pink-700 text-white font-bold"
                >
                    Ir para Pagamento
                </Button>
            </div>
          )}

          {step === 3 && (
             <div className="w-full">
                <Button variant="ghost" onClick={() => setStep(2)} disabled={loading} className="w-full text-zinc-500 hover:text-white mb-2">Voltar</Button>
             </div>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}