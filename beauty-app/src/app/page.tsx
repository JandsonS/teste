"use client";

import { useState } from 'react';
import { DayPicker } from 'react-day-picker';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Clock, X, MapPin, CreditCard, Star, Phone, ShieldCheck, AlertTriangle } from 'lucide-react';
import { SERVICES, SITE_CONFIG, BUSINESS_HOURS } from '@/constants/info';
import 'react-day-picker/dist/style.css';

export default function Home() {
  const [selectedService, setSelectedService] = useState<any>(null);
  const [date, setDate] = useState<Date | undefined>(undefined);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const [clientName, setClientName] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<'ONLINE' | 'LOCAL'>('ONLINE');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1); // 1=Data, 2=Pagamento

  const timeSlots = [];
  for (let i = BUSINESS_HOURS.start; i < BUSINESS_HOURS.end; i++) {
    timeSlots.push(`${i}:00`);
    timeSlots.push(`${i}:30`);
  }

  const handleOpenModal = (service: any) => {
    setSelectedService(service);
    setDate(undefined);
    setSelectedTime(null);
    setStep(1);
    setIsModalOpen(true);
  };

  const handleBooking = async () => {
    if (!clientName.trim()) {
      alert("Por favor, digite seu nome.");
      return;
    }
    setLoading(true);

    try {
      const response = await fetch('/api/payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: selectedService.title,
          price: selectedService.price,
          date: date ? format(date, 'dd/MM/yyyy') : '',
          time: selectedTime,
          clientName: clientName,
          method: paymentMethod
        })
      });

      const data = await response.json();

      if (response.ok) {
        if (data.url) {
          window.location.href = data.url;
        } else {
          window.location.href = `${SITE_CONFIG.url}/sucesso`;
        }
      } else {
        alert(data.error || "Ocorreu um erro ao agendar.");
      }
    } catch (error) {
      alert("Erro de conexão. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-zinc-100 font-sans selection:bg-pink-500/30">
      
      {/* --- HERO SECTION --- */}
      <section className="relative h-[400px] flex flex-col items-center justify-center text-center px-4 bg-zinc-900 overflow-hidden">
        {/* Imagem de Fundo */}
        <div className="absolute inset-0 opacity-40">
           <img 
             src={SITE_CONFIG.images.heroBg} 
             alt="Background" 
             className="w-full h-full object-cover"
           />
           <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#050505]/80 to-[#050505]" />
        </div>
        
        <div className="relative z-10 space-y-4">
            {/* LÓGICA DA LOGO */}
            <div className="w-24 h-24 mx-auto bg-white/10 backdrop-blur-md rounded-full flex items-center justify-center border border-white/20 mb-4 shadow-2xl shadow-pink-500/20 overflow-hidden p-1">
                {SITE_CONFIG.images.logo ? (
                  <img 
                    src={SITE_CONFIG.images.logo} 
                    alt="Logo da Empresa" 
                    className="w-full h-full object-cover rounded-full"
                  />
                ) : (
                  <Star className="text-pink-500 fill-pink-500" size={32} />
                )}
            </div>

            <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-white drop-shadow-lg">
                {SITE_CONFIG.name}
            </h1>
            <p className="text-lg md:text-xl text-zinc-300 max-w-lg mx-auto font-medium drop-shadow-md">
                {SITE_CONFIG.description}
            </p>
            <p className="text-sm text-zinc-400 uppercase tracking-widest bg-black/40 px-3 py-1 rounded-full inline-block backdrop-blur-sm border border-white/10">
                Agendamento Online
            </p>
        </div>
      </section>

      {/* --- LISTA DE SERVIÇOS --- */}
      <main className="max-w-6xl mx-auto px-4 pb-20 -mt-10 relative z-20">
        <div className="flex items-center gap-3 mb-8">
            <div className="w-1 h-8 bg-pink-500 rounded-full"></div>
            <h2 className="text-2xl font-bold text-white">Nossos Procedimentos</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {SERVICES.map((service, index) => (
            <motion.div
                key={index}
                whileHover={{ y: -5 }}
                className="bg-zinc-900 rounded-2xl overflow-hidden border border-zinc-800 hover:border-pink-500/50 transition-all shadow-lg group"
            >
                <div className="h-48 bg-zinc-800 relative overflow-hidden">
                    <img 
                        src={SITE_CONFIG.images.services[index % SITE_CONFIG.images.services.length]} 
                        alt={service.title}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    />
                    <div className="absolute top-3 right-3 bg-black/60 backdrop-blur px-3 py-1 rounded-full text-[10px] font-bold uppercase border border-white/10">
                        Presencial
                    </div>
                </div>

                <div className="p-6">
                    <h3 className="text-xl font-bold text-white mb-2">{service.title}</h3>
                    <p className="text-sm text-zinc-400 mb-4 line-clamp-2">{service.description}</p>
                    <div className="flex items-center justify-between mb-6 p-3 bg-black/20 rounded-lg">
                        <div className="flex items-center gap-2 text-zinc-300 text-sm">
                            <Clock size={16} className="text-pink-500" />
                            {service.duration}
                        </div>
                        <div className="text-pink-500 font-bold text-lg">
                            R$ {service.price.toFixed(2)}
                        </div>
                    </div>
                    <button 
                        onClick={() => handleOpenModal(service)}
                        className="w-full bg-pink-600 hover:bg-pink-700 text-white font-bold py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
                    >
                        Agendar Horário
                    </button>
                </div>
            </motion.div>
          ))}
        </div>
      </main>

      <footer className="bg-zinc-900 border-t border-zinc-800 pt-16 pb-8">
        <div className="max-w-6xl mx-auto px-4 grid md:grid-cols-2 gap-10 mb-12">
            <div>
                <div className="flex items-center gap-2 text-white font-bold text-xl mb-4">
                     {SITE_CONFIG.images.logo ? (
                        <img src={SITE_CONFIG.images.logo} alt="Logo" className="w-6 h-6 rounded-full object-cover" />
                     ) : (
                        <Star className="text-pink-500 fill-pink-500" size={20} />
                     )}
                    {SITE_CONFIG.name}
                </div>
                <p className="text-zinc-400 leading-relaxed max-w-sm">
                    {SITE_CONFIG.description}
                    <br/>
                    Qualidade, segurança e resultados incríveis esperam por você.
                </p>
            </div>
            <div className="md:text-right">
                <h4 className="text-white font-bold mb-4">Fale Conosco</h4>
                <a 
                  href={`https://wa.me/${SITE_CONFIG.whatsappNumber}`} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="text-zinc-400 hover:text-pink-500 transition-colors flex items-center gap-2 md:justify-end mb-2"
                >
                    <Phone size={18} />
                    WhatsApp: {SITE_CONFIG.whatsappDisplay}
                </a>
                <div className="text-zinc-500 text-sm">
                    Atendimento nos horários agendados.
                </div>
            </div>
        </div>
        <div className="border-t border-zinc-800 pt-8 text-center text-zinc-600 text-sm">
            © {new Date().getFullYear()} {SITE_CONFIG.name}. Todos os direitos reservados.
        </div>
      </footer>

      {/* --- MODAL --- */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-4">
            <motion.div 
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                onClick={() => setIsModalOpen(false)}
            />
            
            <motion.div
              initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              className="bg-[#121214] border border-zinc-800 w-full md:max-w-md rounded-t-3xl md:rounded-3xl p-6 shadow-2xl relative z-50 max-h-[90vh] overflow-y-auto"
            >
              <button 
                onClick={() => setIsModalOpen(false)} 
                className="absolute top-5 right-5 text-zinc-500 hover:text-white bg-zinc-900 p-2 rounded-full"
                aria-label="Fechar Modal"
                title="Fechar"
              >
                <X size={20} />
              </button>

              <div className="mb-6">
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                    {step === 1 ? "📅 Escolha a Data" : "💳 Finalizar"}
                </h3>
                <p className="text-zinc-500 text-sm">
                    {selectedService?.title} • R$ {selectedService?.price.toFixed(2)}
                </p>
              </div>

              {step === 1 && (
                <div className="space-y-6">
                    <div className="bg-zinc-900 rounded-xl p-2 border border-zinc-800 flex justify-center">
                        <DayPicker
                            mode="single"
                            selected={date}
                            onSelect={setDate}
                            locale={ptBR}
                            disabled={{ before: new Date() }}
                            
                            // AQUI ESTÁ A CORREÇÃO DA MAIÚSCULA 👇
                            classNames={{
                                caption_label: "capitalize font-bold text-zinc-100" 
                            }}
                            
                            modifiersClassNames={{
                                selected: "bg-pink-600 text-white rounded-lg",
                                today: "text-pink-400 font-bold"
                            }}
                            className="text-zinc-200"
                        />
                    </div>

                    {date && (
                        <div className="grid grid-cols-4 gap-2">
                            {timeSlots.map((time) => (
                                <button
                                    key={time}
                                    onClick={() => setSelectedTime(time)}
                                    className={`py-2 px-1 rounded-lg text-sm font-medium transition-all ${
                                        selectedTime === time
                                        ? 'bg-pink-600 text-white shadow-lg'
                                        : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                                    }`}
                                >
                                    {time}
                                </button>
                            ))}
                        </div>
                    )}

                    <button
                        disabled={!date || !selectedTime}
                        onClick={() => setStep(2)}
                        className="w-full bg-white text-black font-bold py-4 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 hover:bg-zinc-200 transition"
                    >
                        Continuar <ShieldCheck size={18} />
                    </button>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-5">
                    <div className="bg-zinc-900 p-4 rounded-xl border border-zinc-800 text-sm space-y-2">
                        <div className="flex justify-between">
                            <span className="text-zinc-400">Data:</span>
                            <span className="text-white font-medium capitalize">
                                {date && format(date, "dd 'de' MMMM", { locale: ptBR })}
                            </span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-zinc-400">Horário:</span>
                            <span className="text-white font-medium">{selectedTime}</span>
                        </div>
                    </div>

                    <div>
                        <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider ml-1 mb-2 block">Seu Nome</label>
                        <input
                            type="text"
                            placeholder="Nome completo"
                            value={clientName}
                            onChange={(e) => setClientName(e.target.value)}
                            className="w-full bg-black border border-zinc-700 rounded-xl p-4 text-white outline-none focus:border-pink-500 transition"
                        />
                    </div>

                    <div>
                        <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider ml-1 mb-2 block">Pagamento</label>
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                onClick={() => setPaymentMethod('ONLINE')}
                                className={`relative p-4 rounded-xl border flex flex-col items-center gap-2 transition-all ${
                                    paymentMethod === 'ONLINE'
                                    ? 'bg-pink-500/10 border-pink-500 text-pink-500'
                                    : 'bg-zinc-900 border-zinc-800 text-zinc-400'
                                }`}
                            >
                                <CreditCard size={24} />
                                <span className="text-xs font-bold">Pagar Agora</span>
                            </button>
                            
                            <button
                                onClick={() => setPaymentMethod('LOCAL')}
                                className={`p-4 rounded-xl border flex flex-col items-center gap-2 transition-all ${
                                    paymentMethod === 'LOCAL'
                                    ? 'bg-blue-500/10 border-blue-500 text-blue-400'
                                    : 'bg-zinc-900 border-zinc-800 text-zinc-400'
                                }`}
                            >
                                <MapPin size={24} />
                                <span className="text-xs font-bold">No Local</span>
                            </button>
                        </div>
                    </div>

                    {paymentMethod === 'ONLINE' && (
                        <div className="bg-orange-500/10 border border-orange-500/20 rounded-xl p-4 flex gap-3">
                            <div className="text-orange-500 pt-1"><AlertTriangle size={20} /></div>
                            <div>
                                <h4 className="font-bold text-orange-500 text-sm mb-1">PAGAMENTO OBRIGATÓRIO!</h4>
                                <p className="text-zinc-300 text-xs leading-relaxed">
                                    Finalize o pagamento online para sua reserva ser efetivada.
                                    <br/><br/>
                                    <span className="text-white font-bold bg-orange-500/20 px-1 rounded">Caso o pagamento fique pendente, a sua reserva NÃO será efetivada</span> e o horário ficará em aberto para outros clientes.
                                </p>
                            </div>
                        </div>
                    )}

                    <div className="grid grid-cols-3 gap-3">
                         <button onClick={() => setStep(1)} className="col-span-1 bg-zinc-800 hover:bg-zinc-700 text-white font-bold rounded-xl py-4 text-sm">
                            Voltar
                         </button>
                         <button
                            onClick={handleBooking}
                            disabled={loading}
                            className="col-span-2 bg-white hover:bg-zinc-200 text-black font-bold rounded-xl py-4 flex items-center justify-center gap-2"
                        >
                            {loading ? 'Processando...' : 'Confirmar e Pagar'} {!loading && <Check size={18} />}
                        </button>
                    </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}