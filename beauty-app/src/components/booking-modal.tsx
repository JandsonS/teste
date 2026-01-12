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
import { Sparkle, Clock, Calendar as CalendarIcon, CheckCircle2 } from "lucide-react"
import { toast } from "sonner"

interface BookingModalProps {
  serviceName: string
  price: string
  children: React.ReactNode // O botão que abre o modal
}

export function BookingModal({ serviceName, price, children }: BookingModalProps) {
  const [date, setDate] = useState<Date | undefined>(new Date())
  const [selectedTime, setSelectedTime] = useState<string | null>(null)
  const [step, setStep] = useState(1) // 1 = Escolher Data/Hora, 2 = Seus Dados
  const [open, setOpen] = useState(false)

  // Horários fictícios (em um app real viriam do banco de dados)
  const timeSlots = ["09:00", "10:00", "11:00", "14:00", "15:00", "16:30", "18:00"]

  const handleConfirm = () => {
    setOpen(false)
    toast.success("Agendamento Confirmado! 🎉", {
      description: `${serviceName} para ${format(date!, "dd 'de' MMMM", { locale: ptBR })} às ${selectedTime}`,
      duration: 5000,
    })
    // Resetar para a próxima vez
    setTimeout(() => {
      setStep(1)
      setSelectedTime(null)
    }, 500)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] p-0 overflow-hidden bg-white rounded-2xl">
        <div className="bg-rose-950 p-6 text-white text-center">
          <DialogTitle className="text-2xl font-bold mb-1">Agendar Horário</DialogTitle>
          <DialogDescription className="text-rose-200">
            {serviceName} • <span className="font-bold text-white">{price}</span>
          </DialogDescription>
        </div>

        <div className="p-6">
          {step === 1 ? (
            <div className="flex flex-col md:flex-row gap-6">
              {/* Lado Esquerdo: Calendário */}
              <div className="flex-1">
                <Label className="mb-3 block font-bold text-gray-700">1. Escolha o dia</Label>
                <div className="border rounded-xl p-2 bg-gray-50">
                    <Calendar
                    mode="single"
                    selected={date}
                    onSelect={setDate}
                    locale={ptBR}
                    className="rounded-md"
                    disabled={(date) => date < new Date() || date.getDay() === 0} // Desabilita passado e domingos
                    />
                </div>
              </div>

              {/* Lado Direito: Horários */}
              <div className="flex-1">
                <Label className="mb-3 block font-bold text-gray-700">2. Escolha o horário</Label>
                <div className="grid grid-cols-2 gap-2">
                  {timeSlots.map((time) => (
                    <Button
                      key={time}
                      variant={selectedTime === time ? "default" : "outline"}
                      className={selectedTime === time ? "bg-rose-600 hover:bg-rose-700" : "hover:bg-rose-50 border-rose-100"}
                      onClick={() => setSelectedTime(time)}
                    >
                      {time}
                    </Button>
                  ))}
                </div>
                {selectedTime && (
                    <div className="mt-6 p-3 bg-rose-50 rounded-lg text-rose-800 text-sm flex items-center">
                        <CheckCircle2 className="w-4 h-4 mr-2"/>
                        Selecionado: <strong>{format(date!, "dd/MM", { locale: ptBR })} às {selectedTime}</strong>
                    </div>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-4 py-4">
               {/* Passo 2: Dados do Cliente */}
               <div className="space-y-2">
                 <Label>Seu Nome Completo</Label>
                 <Input placeholder="Ex: Maria Silva" className="border-gray-300 focus:ring-rose-500" />
               </div>
               <div className="space-y-2">
                 <Label>Seu WhatsApp</Label>
                 <Input placeholder="(11) 99999-9999" className="border-gray-300 focus:ring-rose-500" />
               </div>
            </div>
          )}
        </div>

        <DialogFooter className="p-6 bg-gray-50 border-t">
          {step === 1 ? (
            <Button 
                className="w-full bg-rose-600 hover:bg-rose-700 text-white font-bold h-12"
                disabled={!selectedTime || !date}
                onClick={() => setStep(2)}
            >
                Continuar
            </Button>
          ) : (
            <div className="flex gap-2 w-full">
                <Button variant="outline" onClick={() => setStep(1)} className="flex-1">Voltar</Button>
                <Button onClick={handleConfirm} className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold">
                    Confirmar Agendamento
                </Button>
            </div>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}