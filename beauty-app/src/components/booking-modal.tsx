"use client"

import { useState, useEffect, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogTitle, DialogTrigger, DialogClose } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { format, isValid } from "date-fns"
import { ptBR } from "date-fns/locale"
import { Wallet, Loader2, CalendarDays, Clock, AlertCircle, QrCode, CreditCard, Check, ChevronLeft, X, Copy, CheckCircle2, MessageCircle } from "lucide-react"
import { toast } from "sonner"
import { DayPicker } from "react-day-picker"
import "react-day-picker/dist/style.css"


interface BookingModalProps { 
  serviceName: string; 
  price: string; 
  children: React.ReactNode 
}

export function BookingModal({ serviceName, price, children }: BookingModalProps) {
  // --- ESTADOS DE FLUXO ---
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState(1) // 1: Data, 2: Dados, 3: Pagamento, 4: QR Code (Novo)
  const [bookingType, setBookingType] = useState<'FULL' | 'DEPOSIT'>('FULL')
  const [loading, setLoading] = useState(false)

  // --- DADOS DO AGENDAMENTO ---
  const [date, setDate] = useState<Date | undefined>(new Date())
  const [selectedTime, setSelectedTime] = useState<string | null>(null)
  
  // --- DADOS DO CLIENTE ---
  const [name, setName] = useState("")
  const [phone, setPhone] = useState("")
  
  // --- PAGAMENTO ---
  const [paymentMethod, setPaymentMethod] = useState<'PIX' | 'CARD'>('PIX')
  const [acceptedTerms, setAcceptedTerms] = useState(false)
  // Novos estados para o Pix Transparente
  const [pixCode, setPixCode] = useState("")
  const [pixImage, setPixImage] = useState("")
  const [paymentId, setPaymentId] = useState("")

  // --- DISPONIBILIDADE ---
  const [busySlots, setBusySlots] = useState<string[]>([]) 
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [availableSlots, setAvailableSlots] = useState<string[]>([])
  const [config, setConfig] = useState<any>({ porcentagemSinal: 20 })

  // --- HELPERS ---
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

  // --- INICIO DO ESPIÃO DE PIX ---
  useEffect(() => {
    // Só roda se tivermos o ID e estivermos na tela 4
    if (!paymentId || step !== 4) return; 

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/check-status?id=${paymentId}`);
        const data = await res.json();

        if (data.status === 'approved') {
           clearInterval(interval); // Para de perguntar
           
           // MENSAGEM DE SUCESSO
           toast.success("Pagamento Confirmado!", {
               description: "Seu horário foi agendado. Voltando para o início...",
               duration: 4000, // Fica 4 segundos na tela
           });
           
           // Espera 3 segundos para o cliente ler e depois recarrega
           setTimeout(() => {
               window.location.reload();
           }, 3000);
        }
      } catch (error) {
        console.error("Erro check status", error);
      }
    }, 3000); 

    return () => clearInterval(interval);
  }, [paymentId, step]);
  // --- FIM DO ESPIÃO ---

  // --- RESETAR AO FECHAR ---
  useEffect(() => { 
      if (!open) { 
          setTimeout(() => { 
            setStep(1); 
            setSelectedTime(null); 
            setAcceptedTerms(false);
            setPixCode("");
            setPixImage("");
          }, 300)
      } 
  }, [open])

  // --- CARREGAR CONFIGS ---
  useEffect(() => {
    fetch("/api/admin/config")
      .then((res) => res.json())
      .then((data) => {
        if (data && !data.error) setConfig((prev: any) => ({ ...prev, ...data }));
      })
      .catch(() => console.log("Usando config padrão"));
  }, [])

  // --- CARREGAR HORÁRIOS ---
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

  // --- FUNÇÃO DE COPIAR PIX ---
  const copyPix = () => {
    navigator.clipboard.writeText(pixCode)
    toast.success("Código Pix copiado!", {
        description: "Cole no app do seu banco para pagar."
    })
  }

  // --- CHECKOUT CORRIGIDO ---
  const handleCheckout = async (paymentType: 'FULL' | 'DEPOSIT') => {
    setBookingType(paymentType);
    if (!acceptedTerms) {
        toast.error("Termos de Uso", { description: "Você precisa aceitar a política de cancelamento." })
        return
    }
    if (!date || !selectedTime || !name || !isPhoneValid) {
        toast.error("Preencha todos os dados corretamente.")
        return 
    }
    
    setLoading(true)
    try {
      const response = await fetch('/api/payment', { 
          method: 'POST', 
          headers: { 'Content-Type': 'application/json' }, 
          body: JSON.stringify({ 
              serviceName, 
              date: format(date, "dd/MM/yyyy"), 
              time: selectedTime, 
              clientName: name, 
              clientWhatsapp: phone,
              method: paymentMethod, 
              
              // --- MUDANÇA AQUI ---
              // Enviamos sempre o PREÇO TOTAL NUMÉRICO (ex: 50.00).
              // O Backend lê o 'paymentType' e calcula a porcentagem se necessário.
              price: numericPrice, 
              // --------------------

              paymentType 
          }), 
      })
      
      const data = await response.json()
      
      if (data.error) { 
          toast.error("Ops!", { description: data.error }); 
          return; 
      }

      // 1. SE RECEBEU QR CODE (PIX TRANSPARENTE)
      if (data.qrCodeBase64) {
          setPixImage(data.qrCodeBase64)
          setPixCode(data.qrCodeCopyPaste)
          setPaymentId(data.id)
          setStep(4) 
          toast.success("Agendamento pré-reservado!", { description: "Realize o pagamento para confirmar." })
      } 
      // 2. SE RECEBEU URL (CARTÃO OU CHECKOUT PRO)
      else if (data.url) {
          window.location.href = data.url 
      }

    } catch (error) { 
        console.error(error)
        toast.error("Erro no Servidor") 
    } finally { 
        setLoading(false) 
    }
  }
  const handleFinish = () => {
      setOpen(false)
      toast.success("Aguardando confirmação!", { 
          description: "Assim que o pagamento cair, você receberá a confirmação." 
      })
      window.location.reload() // Opcional: recarrega para atualizar horários
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      
      <DialogContent className="fixed z-50 bg-[#09090b] text-white p-0 gap-0 border-0 shadow-2xl focus:outline-none
        w-screen h-[100dvh] max-w-none m-0 rounded-none left-0 top-0 translate-x-0 translate-y-0
        sm:w-full sm:h-auto sm:max-w-[480px] sm:max-h-[90vh] sm:border sm:border-zinc-800 sm:rounded-3xl 
        sm:left-[50%] sm:top-[50%] sm:-translate-x-1/2 sm:-translate-y-1/2
        animate-in fade-in zoom-in-95 duration-200 flex flex-col">

        {/* ================================================================= */}
        {/* CSS DO BOTÃO 29 E LAYOUT */}
        {/* ================================================================= */}
        <style jsx>{`
          .btn-29, .btn-29 *, .btn-29 :after, .btn-29 :before, .btn-29:after, .btn-29:before { border: 0 solid; box-sizing: border-box; }
          .btn-29 { -webkit-tap-highlight-color: transparent; -webkit-appearance: button; background-color: #000; background-image: none; color: #fff; cursor: pointer; font-size: 100%; font-weight: 900; line-height: 1.5; margin: 0; -webkit-mask-image: -webkit-radial-gradient(#000, #fff); padding: 0; text-transform: uppercase; }
          .btn-29:disabled { cursor: default; opacity: 0.5; }
          .btn-29:-moz-focusring { outline: auto; }
          .btn-29 svg { display: block; vertical-align: middle; }
          .btn-29 [hidden] { display: none; }
          .btn-29 { --tilt: 30px; border-width: 1px; display: grid; place-content: center; }
          .btn-29, .btn-29 .text-container { overflow: hidden; position: relative; }
          .btn-29 .text-container { display: block; width: fit-content; }
          .btn-29 .text { display: block; font-weight: 900; mix-blend-mode: difference; position: relative; }
          .btn-29:hover .text { -webkit-animation: move-right-alternate 0.3s ease forwards; animation: move-right-alternate 0.3s ease forwards; }
          @-webkit-keyframes move-right-alternate { 0% { transform: translateX(0); } 50% { transform: translateX(80%); } 51% { transform: translateX(-80%); } to { transform: translateX(0); } }
          @keyframes move-right-alternate { 0% { transform: translateX(0); } 50% { transform: translateX(80%); } 51% { transform: translateX(-80%); } to { transform: translateX(0); } }
          .btn-29:before { -webkit-animation: move-out 0.3s ease; animation: move-out 0.3s ease; background: #fff; -webkit-clip-path: polygon(0 0, calc(100% - var(--tilt)) 0, 100% 50%, calc(100% - var(--tilt)) 100%, 0 100%); clip-path: polygon(0 0, calc(100% - var(--tilt)) 0, 100% 50%, calc(100% - var(--tilt)) 100%, 0 100%); content: ""; height: 100%; left: calc(-100% - var(--tilt)); position: absolute; top: 0; width: calc(100% + var(--tilt)); }
          .btn-29:hover:before { -webkit-animation: move-in 0.3s ease forwards; animation: move-in 0.3s ease forwards; }
          @-webkit-keyframes move-in { 0% { transform: translateX(0); } to { transform: translateX(100%); } }
          @keyframes move-in { 0% { transform: translateX(0); } to { transform: translateX(100%); } }
          @-webkit-keyframes move-out { 0% { transform: translateX(100%); } to { transform: translateX(200%); } }
          @keyframes move-out { 0% { transform: translateX(100%); } to { transform: translateX(200%); } }
        `}</style>
        
        {/* === HEADER (FIXO) === */}
        <div className="flex-none px-5 py-4 border-b border-zinc-800 bg-[#09090b] flex justify-between items-center z-10 safe-area-top">
            <div className="flex items-center gap-3">
                <DialogClose className="p-2 -ml-2 rounded-full hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors" aria-label="Fechar">
                   <X size={22} />
                </DialogClose>
                <div>
                    <DialogTitle className="text-base font-bold text-white leading-tight">
                        {step === 1 && "Escolha a Data"}
                        {step === 2 && "Seus Dados"}
                        {step === 3 && "Pagamento"}
                        {step === 4 && "Pagamento Pix"}
                    </DialogTitle>
                    <p className="text-xs text-zinc-500 font-medium truncate max-w-[180px]">{serviceName}</p>
                </div>
            </div>
            <div className="bg-emerald-500/10 px-3 py-1.5 rounded-lg border border-emerald-500/20">
                <span className="text-emerald-400 font-bold text-sm">{price}</span>
            </div>
        </div>

        {/* === CORPO (ROLAGEM) === */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar bg-[#09090b]">
          
          <div className="p-5 pb-28 sm:pb-5"> 
          
            {/* PASSO 1: CALENDÁRIO E DATA */}
            {step === 1 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="flex justify-center sm:bg-zinc-900/40 sm:border sm:border-zinc-800 sm:rounded-2xl sm:p-2">
                    <style>{`
                      .rdp { margin: 0; --rdp-cell-size: 40px; } 
                      .rdp-caption_label { text-transform: capitalize; color: white; font-weight: 700; font-size: 1rem; margin-bottom: 10px; } 
                      .rdp-nav { margin-bottom: 10px; }
                      .rdp-day_selected { background-color: white !important; color: black !important; font-weight: bold; border-radius: 10px; } 
                      .rdp-day { color: #a1a1aa; font-size: 0.95rem; border-radius: 10px; } 
                      .rdp-day:hover:not(.rdp-day_selected) { background-color: #27272a; } 
                      .rdp-button:hover:not([disabled]) { background-color: #27272a; }
                      @media (max-width: 640px) { .rdp { --rdp-cell-size: 42px; width: 100%; } .rdp-month { width: 100%; } .rdp-table { width: 100%; max-width: 100%; } }
                    `}</style>
                    <DayPicker mode="single" selected={date} onSelect={setDate} locale={ptBR} disabled={{ before: new Date() }} />
                </div>

                {date && (
                  <div className="animate-in slide-in-from-bottom-4 fade-in duration-500 pt-2 border-t border-zinc-900 sm:border-0">
                      <Label className="mb-4 flex justify-between items-end px-1 mt-4">
                          <span className="text-sm font-bold text-white flex items-center gap-2">
                              <Clock size={16} className="text-emerald-500"/> Horários Disponíveis
                          </span>
                          {loadingSlots && <Loader2 className="animate-spin w-3 h-3 text-zinc-500"/>}
                      </Label>
                      
                      <div className="grid grid-cols-4 gap-2">
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
                          <Label className="text-zinc-300 text-xs font-bold uppercase ml-1">Seu Nome Completo</Label>
                          <Input placeholder="Como prefere ser chamado?" className="bg-zinc-900 border-zinc-800 text-white h-14 text-lg px-4 rounded-xl focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 transition-all placeholder:text-zinc-600" value={name} onChange={(e) => setName(e.target.value)}/>
                      </div>
                      <div className="space-y-2">
                          <Label className="text-zinc-300 text-xs font-bold uppercase ml-1">Seu WhatsApp</Label>
                          <Input type="tel" placeholder="(00) 00000-0000" className="bg-zinc-900 border-zinc-800 text-white h-14 text-lg px-4 rounded-xl focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 transition-all placeholder:text-zinc-600" value={phone} onChange={(e) => setPhone(formatPhone(e.target.value))} maxLength={15} />
                      </div>
                  </div>
              </div>
            )}

            {/* PASSO 3: PAGAMENTO (ESCOLHA) */}
            {step === 3 && (
              <div className="space-y-5 pt-1 animate-in fade-in slide-in-from-right-8 duration-300">
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
                      {/* BOTÃO 1: PAGAR TUDO */}
                      <button onClick={() => handleCheckout('FULL')} disabled={loading || !acceptedTerms} className={`group relative overflow-hidden flex items-center justify-between p-5 rounded-2xl border text-left transition-all active:scale-[0.98] ${!acceptedTerms ? 'opacity-50 cursor-not-allowed bg-zinc-900 border-zinc-800' : 'bg-zinc-900/50 border-zinc-700 hover:bg-zinc-800 hover:border-zinc-500'}`}>
                          <div className="flex items-center gap-4 relative z-10">
                              <div className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-400 group-hover:text-white transition-colors">
                                {loading && paymentMethod === 'PIX' ? <Loader2 className="animate-spin"/> : <Wallet size={24} />}
                              </div>
                              <div>
                                  <p className="font-bold text-white text-base">
                                      {paymentMethod === 'PIX' ? 'Pagar Total (Pix)' : 'Pagar Total (Cartão)'}
                                  </p>
                                  <p className="text-xs text-zinc-500">Agendamento Integral.</p>
                              </div>
                          </div>
                          <span className="font-bold text-white text-lg relative z-10">{formatMoney(numericPrice)}</span>
                      </button>

                      {/* BOTÃO 2: PAGAR SINAL */}
                      <button onClick={() => handleCheckout('DEPOSIT')} disabled={loading || !acceptedTerms} className={`group relative overflow-hidden flex items-center justify-between p-5 rounded-2xl border text-left transition-all active:scale-[0.98] ${!acceptedTerms ? 'opacity-50 cursor-not-allowed bg-zinc-900 border-zinc-800' : 'bg-zinc-900/50 border-zinc-700 hover:bg-zinc-800 hover:border-zinc-500'}`}>
                          <div className="flex items-center gap-4 relative z-10">
                              <div className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-400 group-hover:text-white transition-colors">
                                {loading && paymentMethod === 'PIX' ? <Loader2 className="animate-spin"/> : <Clock size={24} />}
                              </div>
                              <div>
                                  <p className="font-bold text-white text-base">Reservar Vaga ({config.porcentagemSinal}%)</p>
                                  <p className="text-xs text-zinc-500">Restante do valor no local.</p>
                              </div>
                          </div>
                          <span className="font-bold text-white text-lg relative z-10">{formatMoney(depositValue)}</span>
                      </button>
                  </div>
              </div>
            )}

            {/* PASSO 4: EXIBIÇÃO DO QR CODE (NOVO) */}
         {step === 4 && (
  <div className="space-y-6">
      {/* 1. IMAGEM DO QR CODE */}
      <div className="flex justify-center py-4">
          <div className="bg-white p-3 rounded-2xl shadow-sm border border-zinc-200">
              {pixImage ? (
                  <img 
                    src={`data:image/jpeg;base64,${pixImage}`} 
                    alt="QR Code Pix" 
                    className="w-48 h-48 object-contain" 
                  />
              ) : (
                  <div className="w-48 h-48 flex items-center justify-center text-zinc-400 text-xs">
                      Carregando QR Code...
                  </div>
              )}
          </div>
      </div>

      {/* 2. INPUT DE COPIAR */}
      <div className="text-center space-y-3">
          <p className="text-zinc-400 text-sm font-medium">Escaneie ou copie o código Pix:</p>
          <div className="w-full flex gap-2">
              <Input 
                  value={pixCode} 
                  readOnly 
                  className="bg-zinc-900/50 border-zinc-800 text-zinc-400 font-mono text-xs h-12 text-center" 
              />
              <Button onClick={copyPix} className="h-12 w-12 shrink-0 bg-zinc-800 hover:bg-zinc-700 text-white border border-zinc-700">
                  <Copy size={18} />
              </Button>
          </div>
      </div>

      {/* 3. AVISO DE AGUARDANDO (Sem botão embaixo) */}
      <div className="flex flex-col items-center gap-2 bg-emerald-500/5 border border-emerald-500/20 p-4 rounded-xl text-center">
           <div className="flex items-center gap-2">
               <Loader2 className="animate-spin text-emerald-500" size={18} />
               <p className="text-sm font-bold text-emerald-400">Aguardando confirmação...</p>
           </div>
           <p className="text-xs text-zinc-500">
              Não feche esta tela. Assim que o pagamento for identificado, você será redirecionado automaticamente.
           </p>
      </div>
  </div>
)}
          </div>
        </div>
        
        {/* === RODAPÉ (BOTÕES DE AÇÃO COM ESTILO 29) === */}
        <div className="flex-none p-5 bg-[#09090b]/90 backdrop-blur-md border-t border-zinc-800/50 z-20 pb-8 sm:pb-5 safe-area-bottom transition-all">
          
          {step === 1 && (
             <div className="flex gap-3 animate-in slide-in-from-bottom-2">
                 <Button 
                    className="h-14 w-14 rounded-2xl bg-zinc-800 hover:bg-zinc-700 text-white border border-zinc-600 flex items-center justify-center transition-all active:scale-90" 
                    onClick={() => setOpen(false)}
                 >
                    <ChevronLeft size={24} />
                 </Button>

                 <div className="flex-1">
                   {selectedTime ? (
                       <button className="btn-29 border border-white w-full rounded-2xl h-14" onClick={() => setStep(2)}>
                          <span className="text-container"><span className="text">CONTINUAR</span></span>
                       </button>
                   ) : (
                       <Button disabled className="w-full h-14 bg-zinc-900 text-zinc-600 font-bold text-base rounded-2xl border border-zinc-800 cursor-not-allowed hover:bg-zinc-900">
                          ESCOLHA UM HORÁRIO
                       </Button>
                   )}
                 </div>
             </div>
          )}
          
          {step === 2 && isPhoneValid && name.length > 2 && (
             <div className="flex gap-3 animate-in slide-in-from-bottom-2">
                 <Button 
                    className="h-14 w-14 rounded-2xl bg-zinc-800 hover:bg-zinc-700 text-white border border-zinc-600 flex items-center justify-center transition-all active:scale-90" 
                    onClick={() => setStep(1)}
                 >
                    <ChevronLeft size={24} />
                 </Button>
                 
                 <div className="flex-1">
                   <button className="btn-29 border border-white w-full rounded-2xl h-14" onClick={() => setStep(3)}>
                      <span className="text-container"><span className="text">IR PARA PAGAMENTO</span></span>
                   </button>
                 </div>
             </div>
          )}
          
          {step === 3 && (
             <div className="flex gap-3 animate-in slide-in-from-bottom-2">
                 <Button 
                    className="h-14 w-14 rounded-2xl bg-zinc-800 hover:bg-zinc-700 text-white border border-zinc-600 flex items-center justify-center transition-all active:scale-90" 
                    onClick={() => setStep(2)}
                 >
                    <ChevronLeft size={24} />
                 </Button>
                 <div className="flex-1 flex items-center justify-center text-zinc-400 text-xs uppercase tracking-widest font-medium">
                    Revise os dados acima
                 </div>
             </div>
          )}

          {/* RODAPÉ DO PASSO 4 (FINALIZAR) */}
          {step === 4 && (
             <div className="flex gap-3 animate-in slide-in-from-bottom-2">
                 <button className="btn-29 border border-emerald-500 w-full rounded-2xl h-14" onClick={handleFinish}>
                    <span className="text-container"><span className="text text-emerald-400">JÁ REALIZEI O PAGAMENTO</span></span>
                 </button>
             </div>
          )}
        </div>

      </DialogContent>
    </Dialog>
  )
}