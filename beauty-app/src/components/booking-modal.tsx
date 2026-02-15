"use client"

import { useState, useEffect, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogTitle, DialogTrigger, DialogClose } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { format, isValid } from "date-fns"
import { ptBR } from "date-fns/locale"
import { Wallet, Loader2, CalendarDays, Clock, AlertCircle, QrCode, CreditCard, Check, ChevronLeft, X, Copy, CheckCircle2 } from "lucide-react"
import { toast } from "sonner"
import { DayPicker } from "react-day-picker"
import "react-day-picker/dist/style.css"

interface BookingModalProps { 
  serviceName: string; 
  price: string; 
  establishmentId: string;
  slug: string;
  children: React.ReactNode 
}

export function BookingModal({ serviceName, price, establishmentId, slug, children }: BookingModalProps) {
  // --- ESTADOS DE FLUXO ---
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState(1) // 1: Data, 2: Dados, 3: Pagamento, 4: QR Code
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
  
  // --- PIX TRANSPARENTE (Novos Estados) ---
  const [pixCode, setPixCode] = useState("")
  const [pixImage, setPixImage] = useState("")
  const [bookingId, setBookingId] = useState("") 
  const [isPaid, setIsPaid] = useState(false) // Para animação de sucesso

  // --- DISPONIBILIDADE ---
  const [busySlots, setBusySlots] = useState<string[]>([]) 
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [availableSlots, setAvailableSlots] = useState<string[]>([])
  
  const [config, setConfig] = useState<any>({ porcentagemSinal: 50 })

  // --- HELPERS ---
  const formatPhone = (value: string) => value.replace(/\D/g, '').slice(0, 11).replace(/(\d{2})(\d)/, '($1) $2').replace(/(\d{5})(\d)/, '$1-$2').replace(/(-\d{4})\d+?$/, '$1')
  const isPhoneValid = phone.replace(/\D/g, '').length >= 10
  
  const numericPrice = useMemo(() => { 
    if (!price) return 0; 
    const c = price.replace('R$', '').trim(); 
    return parseFloat(c.includes(',') ? c.replace(/\./g, '').replace(',', '.') : c); 
  }, [price])

  const depositValue = (numericPrice * (config.porcentagemSinal || 50)) / 100
  const formatMoney = (val: number) => val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

  // --- AJUSTE MULTI-BANCOS: Renderiza QR Code corretamente (Link ou Base64) ---
  const renderQrCode = (imgString: string) => {
    if (!imgString) return "";
    if (imgString.startsWith("http")) return imgString; // PagBank manda Link
    if (imgString.startsWith("data:")) return imgString; // Já tem prefixo
    return `data:image/png;base64,${imgString}`; // Adiciona prefixo se faltar
  };

  // --- CARREGA CONFIGURAÇÕES ---
  useEffect(() => {
    if(open && slug) {
        fetch(`/api/settings?slug=${slug}`)
        .then((res) => res.json())
        .then((data) => {
            if (data && !data.error) setConfig((prev: any) => ({ ...prev, ...data }));
        })
        .catch(() => console.log("Usando config padrão"));
    }
  }, [open, slug])

  // --- RESETAR AO FECHAR ---
  useEffect(() => { 
      if (!open) { 
          setTimeout(() => { 
            setStep(1); 
            setSelectedTime(null); 
            setAcceptedTerms(false);
            setPixCode("");
            setPixImage("");
            setIsPaid(false);
            setBookingId("");
            setLoading(false); // Garante reset do loading
          }, 300)
      } 
  }, [open])

 // --- ESPIÃO DE PAGAMENTO (Polling) ---
 useEffect(() => {
    let interval: NodeJS.Timeout;

    if (step === 4 && bookingId && !isPaid) {
        interval = setInterval(async () => {
            try {
                const res = await fetch(`/api/bookings?bookingId=${bookingId}`);
                if (res.ok) {
                    const data = await res.json();
                    // Verifica status CONFIRMADO ou PAGO
                    if (data && (data.status === 'CONFIRMADO' || data.status === 'PAGO')) {
                        setIsPaid(true);
                        toast.success("Pagamento Confirmado!", { description: "Seu horário está garantido." });
                        clearInterval(interval);
                    }
                }
            } catch (error) {
                console.error("Erro ao verificar status", error);
            }
        }, 3000);
    }
    return () => clearInterval(interval);
 }, [step, bookingId, isPaid]);

 // --- CARREGAR HORÁRIOS ---
  useEffect(() => {
    if (!date || !isValid(date)) { 
        setBusySlots([]); 
        setSelectedTime(null); 
        return; 
    }

    setLoadingSlots(true); 
    setBusySlots([]); 
    setSelectedTime(null); 
    
    const params = new URLSearchParams({ 
        date: format(date, "dd/MM/yyyy"), 
        service: serviceName,
        establishmentId: establishmentId 
    })

    fetch(`/api/availability?${params.toString()}`)
        .then(res => {
            if (!res.ok) throw new Error("Erro na API");
            return res.json();
        })
        .then(data => { 
            if (data.busy) setBusySlots(data.busy)
            if (data.available) setAvailableSlots(data.available)
            // Fallback se API não retornar slots
            if (!data.available || data.available.length === 0) {
                setAvailableSlots(["09:00", "10:00", "11:00", "14:00", "15:00", "16:00", "17:00", "18:00"]);
            }
            setLoadingSlots(false)
        })
        .catch((err) => {
            console.error(err);
            setAvailableSlots(["09:00", "10:00", "11:00", "14:00", "15:00", "16:00"]); 
            setLoadingSlots(false);
        })
  }, [date, establishmentId, serviceName])

  const handleTimeClick = (time: string) => {
    if (busySlots.includes(time)) { 
        toast.error("Horário Indisponível"); 
        return; 
    }
    setSelectedTime(time);
  }
  
  const copyPix = () => {
    navigator.clipboard.writeText(pixCode)
    toast.success("Código Pix copiado!", {
        description: "Cole no app do seu banco para pagar."
    })
  }

  // =========================================================
  // ⚡️ FUNÇÃO CHECKOUT (Compatível com Multi-Bancos)
  // =========================================================
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
      const response = await fetch('/api/bookings', { 
          method: 'POST', 
          headers: { 'Content-Type': 'application/json' }, 
          body: JSON.stringify({ 
              slug, 
              establishmentId, 
              name: name, 
              phone: phone,
              date: format(date, "yyyy-MM-dd"), 
              time: selectedTime, 
              serviceName: serviceName, 
              price: numericPrice,           
              method: paymentMethod, 
              paymentType: paymentType 
           }), 
      })
      
      const data = await response.json()
      
      if (data.error) { 
          toast.error("Ops!", { description: data.error }); 
          setLoading(false);
          return; 
      }

      // SUCESSO! Leitura universal da resposta
      if (paymentMethod === 'PIX') {
          // Lê os campos novos padronizados, mantendo fallback para os antigos
          setPixCode(data.qrCodeCopiaCola || data.copiaCola || data.payload || data.pixCode);
          setPixImage(data.qrCodeBase64 || data.fullImage || data.base64 || data.image);
          
          setBookingId(data.bookingId); 

          setStep(4);
          setLoading(false);
      } else {
          toast.success("Agendamento Solicitado!");
          setOpen(false);
      }

    } catch (error) { 
        console.error(error)
        toast.error("Erro no Servidor") 
        setLoading(false)
    }
  }

  const handleFinish = () => {
      setOpen(false)
      window.location.reload()
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      
      <DialogContent className="fixed z-50 bg-[#09090b] text-white p-0 gap-0 border-0 shadow-2xl focus:outline-none
        w-screen h-[100dvh] max-w-none m-0 rounded-none left-0 top-0 translate-x-0 translate-y-0
        sm:w-full sm:h-auto sm:max-w-[480px] sm:max-h-[90vh] sm:border sm:border-zinc-800 sm:rounded-3xl 
        sm:left-[50%] sm:top-[50%] sm:-translate-x-1/2 sm:-translate-y-1/2
        animate-in fade-in zoom-in-95 duration-200 flex flex-col">

        {/* ESTILOS CSS DO BOTÃO (BTN-29) */}
        <style jsx global>{`
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
            <div className="bg-emerald-500/10 px-3 py-1.5 rounded-lg border border-emerald-500/20 transition-all duration-300">
                <span className="text-emerald-400 font-bold text-sm">
                    {step === 4 && bookingType === 'DEPOSIT' 
                        ? formatMoney(depositValue) 
                        : price 
                    }
                </span>
            </div>
        </div>

        {/* === CORPO (ROLAGEM) === */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar bg-[#09090b]">
          
          <div className="p-5 pb-28 sm:pb-5"> 
          
            {/* PASSO 1: CALENDÁRIO */}
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

            {/* PASSO 3: ESCOLHA PAGAMENTO */}
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
                                {loading && bookingType === 'FULL' ? <Loader2 className="animate-spin"/> : <Wallet size={24} />}
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
                                {loading && bookingType === 'DEPOSIT' ? <Loader2 className="animate-spin"/> : <Clock size={24} />}
                              </div>
                              <div>
                                  <p className="font-bold text-white text-base">Reservar Vaga ({config.porcentagemSinal || 50}%)</p>
                                  <p className="text-xs text-zinc-500">Restante do valor no local.</p>
                              </div>
                          </div>
                          <span className="font-bold text-white text-lg relative z-10">{formatMoney(depositValue)}</span>
                      </button>
                  </div>
              </div>
            )}

           {/* PASSO 4: EXIBIR PIX E TELA DE SUCESSO */}
            {step === 4 && (
                <div className="flex flex-col items-center justify-center pt-2 animate-in zoom-in-95 duration-500 w-full">
                    {!isPaid ? (
                        /* --- PARTE 1: TELA DO QR CODE (Aguardando) --- */
                        <>
                            <div className="text-center mb-6">
                                <h3 className="text-white font-bold text-xl mb-2">Pague para Confirmar</h3>
                                <p className="text-zinc-400 text-sm max-w-[250px] mx-auto leading-relaxed">
                                    Abra o app do seu banco e escaneie o código abaixo.
                                </p>
                            </div>

                            <div className="bg-white p-4 rounded-3xl mb-6 shadow-[0_0_40px_rgba(16,185,129,0.15)] relative group">
                                <div className="absolute inset-0 border-2 border-dashed border-zinc-300 rounded-3xl pointer-events-none group-hover:border-emerald-500 transition-colors"></div>
                                {pixImage ? (
                                    <img 
                                        src={renderQrCode(pixImage)} 
                                        alt="Pix QR Code" 
                                        className="w-48 h-48 sm:w-56 sm:h-56 mix-blend-multiply object-contain" 
                                    />
                                ) : (
                                    <div className="w-48 h-48 bg-zinc-100 flex items-center justify-center text-zinc-400 text-xs rounded-xl">
                                        <Loader2 className="animate-spin mr-2"/> Gerando Pix...
                                    </div>
                                )}
                            </div>

                            <div className="w-full space-y-3">
                                <button onClick={copyPix} className="w-full bg-zinc-800 hover:bg-zinc-700 text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 transition-all border border-zinc-700 active:scale-95">
                                    <Copy size={18} /> Copiar Código Pix
                                </button>
                                
                                <div className="flex items-center justify-center gap-2 text-zinc-500 text-xs mt-4">
                                    <Loader2 className="animate-spin w-3 h-3"/> Aguardando pagamento...
                                </div>
                            </div>
                        </>
                    ) : (
                        /* --- PARTE 2: NOVA TELA DE SUCESSO (Comprovante) --- */
                        <div className="flex flex-col items-center py-2 w-full animate-in slide-in-from-bottom-10 fade-in duration-700">
                            
                            {/* Ícone Pulsando */}
                            <div className="relative mb-6">
                                <div className="absolute inset-0 bg-emerald-500 blur-2xl opacity-20 animate-pulse"></div>
                                <div className="w-20 h-20 bg-emerald-500 rounded-full flex items-center justify-center text-black shadow-[0_0_30px_#10b981] relative z-10">
                                    <CheckCircle2 size={40} className="stroke-[3]"/>
                                </div>
                            </div>

                            <h3 className="text-3xl font-black text-white mb-2 text-center tracking-tight">Agendado!</h3>
                            <p className="text-zinc-400 text-center text-sm mb-6">Te esperamos em breve!</p>

                            {/* Cartão de Resumo (O "Comprovante") */}
                            <div className="w-full bg-zinc-900/50 border border-zinc-800 rounded-2xl p-5 mb-6 space-y-4">
                                <div className="flex justify-between items-center border-b border-zinc-800 pb-3">
                                    <span className="text-zinc-500 text-xs font-bold uppercase tracking-wider">Serviço</span>
                                    <span className="text-white font-bold text-sm text-right truncate max-w-[180px]">{serviceName}</span>
                                </div>
                                <div className="flex justify-between items-center border-b border-zinc-800 pb-3">
                                    <span className="text-zinc-500 text-xs font-bold uppercase tracking-wider">Data e Hora</span>
                                    <div className="text-right">
                                        <span className="text-white font-bold text-sm block">
                                            {date ? format(date, "dd/MM", { locale: ptBR }) : ""} às {selectedTime}
                                        </span>
                                    </div>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-zinc-500 text-xs font-bold uppercase tracking-wider">Status</span>
                                    <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-1 rounded text-xs font-bold">CONFIRMADO</span>
                                </div>
                            </div>

                            {/* Botão de Ação */}
                            <Button 
                                onClick={handleFinish} 
                                className="bg-white text-black hover:bg-zinc-200 font-black text-sm uppercase tracking-wide px-8 py-6 rounded-2xl w-full shadow-lg hover:shadow-xl transition-all active:scale-95"
                            >
                                Voltar para o Início
                            </Button>
                        </div>
                    )}
                </div>
            )}
          </div>
        </div>
        
        {/* === RODAPÉ (BOTÕES DE AÇÃO) === */}
        {step !== 4 && (
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
            </div>
        )}

        {/* Rodapé especial para o passo 4 se ainda não pagou */}
        {step === 4 && !isPaid && (
            <div className="flex-none p-5 bg-[#09090b]/90 backdrop-blur-md border-t border-zinc-800/50 z-20 pb-8 sm:pb-5">
                <Button onClick={handleFinish} variant="ghost" className="w-full text-zinc-500 hover:text-white hover:bg-zinc-900">
                    Fechar e Pagar Depois
                </Button>
            </div>
        )}

      </DialogContent>
    </Dialog>
  )
}