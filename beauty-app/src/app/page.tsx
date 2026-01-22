"use client";

import { useState, useRef } from 'react';
import { motion, AnimatePresence, Variants } from 'framer-motion';
import { Clock, Instagram, MapPin, ChevronDown, CalendarDays, ArrowUpRight } from 'lucide-react';
import { SERVICES, SITE_CONFIG } from '@/constants/info'; // Importando suas constantes
import { BookingModal } from "@/components/booking-modal"; 

// --- ÍCONE DO WHATSAPP ---
function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} xmlns="http://www.w3.org/2000/svg">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
    </svg>
  );
}

export default function Home() {
  const [showServices, setShowServices] = useState(false);
  const servicesRef = useRef<HTMLDivElement>(null);

  const toggleServices = () => {
    const newState = !showServices;
    setShowServices(newState);
    if (newState) {
        setTimeout(() => {
            servicesRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
    }
  };

  const containerVariants: Variants = {
    hidden: { opacity: 0, height: 0 },
    visible: { opacity: 1, height: 'auto', transition: { staggerChildren: 0.1, duration: 0.5 } },
    exit: { opacity: 0, height: 0, transition: { duration: 0.3 } }
  };

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 100 } }
  };

  const whatsappMessage = encodeURIComponent("Olá, estou precisando de ajuda com o agendamento online");

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-zinc-100 font-sans selection:bg-pink-500/30 overflow-x-hidden">
      
      <div className="fixed inset-0 z-0 pointer-events-none">
          <div className="absolute top-[-10%] left-[-10%] w-[300px] md:w-[600px] h-[300px] md:h-[600px] bg-pink-600/10 rounded-full blur-[80px] md:blur-[120px] opacity-40 animate-pulse" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[300px] md:w-[600px] h-[300px] md:h-[600px] bg-purple-600/10 rounded-full blur-[80px] md:blur-[120px] opacity-40 animate-pulse delay-1000" />
      </div>

      {/* --- HERO SECTION --- */}
      <section className={`relative transition-all duration-1000 ease-in-out ${showServices ? 'min-h-[40vh] py-12' : 'h-[100vh]'} flex flex-col items-center justify-center text-center px-4 overflow-hidden z-10`}>
        <div className="absolute inset-0 z-0">
            <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0a]/40 via-[#0a0a0a]/90 to-[#0a0a0a] z-10" />
            <motion.img 
              initial={{ scale: 1.1 }}
              animate={{ scale: 1 }}
              transition={{ duration: 10, repeat: Infinity, repeatType: "reverse" }}
              src={SITE_CONFIG.images.heroBg} 
              alt="Background" 
              className="w-full h-full object-cover opacity-40"
            />
        </div>
        
        <div className="relative z-20 flex flex-col items-center space-y-6 max-w-4xl mx-auto w-full">
            <motion.div 
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", stiffness: 260, damping: 20 }}
                className="w-24 h-24 md:w-40 md:h-40 bg-white/5 backdrop-blur-2xl rounded-full flex items-center justify-center border border-white/10 shadow-[0_0_50px_rgba(236,72,153,0.4)] p-1.5"
            >
                {SITE_CONFIG.images.logo && <img src={SITE_CONFIG.images.logo} alt="Logo" className="w-full h-full object-cover rounded-full" />}
            </motion.div>

            <div className="space-y-4 px-2">
                <motion.h1 
                    layout
                    className="text-3xl sm:text-5xl md:text-7xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-white to-zinc-500 drop-shadow-2xl leading-tight"
                >
                    {SITE_CONFIG.name}
                </motion.h1>
                <motion.p 
                    layout
                    className="text-sm sm:text-lg md:text-2xl text-zinc-300 font-light max-w-xl mx-auto leading-relaxed"
                >
                    {SITE_CONFIG.description}
                </motion.p>
            </div>
            
            <div className="flex flex-col items-center gap-4 mt-8 w-full px-4">
                <motion.button
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1 }}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={toggleServices}
                    className={`
                        group relative px-6 py-4 md:px-8 rounded-full font-bold text-base md:text-lg transition-all flex items-center justify-center gap-3 w-full sm:w-auto
                        ${showServices 
                            ? 'bg-zinc-800 text-white border border-zinc-700' 
                            : 'bg-white text-black shadow-[0_0_30px_rgba(255,255,255,0.3)] hover:shadow-[0_0_50px_rgba(236,72,153,0.6)]'}
                    `}
                >
                    <span className="relative z-10 flex items-center gap-2">
                        <CalendarDays className={showServices ? "text-pink-500" : "text-pink-600"} />
                        {showServices ? "FECHAR AGENDAMENTO" : "AGENDAMENTO ONLINE"}
                    </span>
                    <motion.div animate={{ rotate: showServices ? 180 : 0 }} transition={{ duration: 0.3 }}>
                        <ChevronDown size={20} className={showServices ? "text-zinc-400" : "text-zinc-400 group-hover:text-pink-600"} />
                    </motion.div>
                </motion.button>
                
                {!showServices && (
                    <motion.p initial={{ opacity: 0 }} animate={{ opacity: 0.6 }} className="text-[10px] md:text-xs text-zinc-400 font-medium tracking-wide animate-pulse">
                        clique aqui para realizar seu agendamento
                    </motion.p>
                )}

                {SITE_CONFIG.links.instagram && (
                    <motion.a 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.5 }}
                        href={SITE_CONFIG.links.instagram}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-2 px-5 py-2 rounded-full border border-white/10 bg-white/5 hover:bg-pink-600 hover:border-pink-500 text-zinc-300 hover:text-white text-xs md:text-sm flex items-center gap-2 transition-all hover:scale-105 backdrop-blur-sm"
                    >
                        <Instagram size={16} /> <span>Siga-nos no Instagram</span>
                    </motion.a>
                )}
            </div>
        </div>
      </section>

      {/* --- SERVIÇOS (TOTALMENTE AUTOMÁTICO VIA info.ts) --- */}
      <AnimatePresence>
        {showServices && (
            <motion.section 
                ref={servicesRef}
                className="max-w-7xl mx-auto px-4 pb-32 relative z-20"
                initial="hidden"
                animate="visible"
                exit="exit"
                variants={containerVariants}
            >
                <div className="flex flex-col items-center justify-center mb-12 gap-4 pt-8 border-t border-white/5">
                    <motion.div initial={{ width: 0 }} animate={{ width: 100 }} className="h-1 bg-gradient-to-r from-pink-500 to-purple-600 rounded-full" />
                    <h2 className="text-2xl md:text-5xl font-bold text-white tracking-tight text-center">{SITE_CONFIG.text.servicesTitle}</h2>
                    <p className="text-zinc-500 text-sm text-center max-w-lg">Selecione o procedimento desejado.</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
                {SERVICES.map((service, index) => {
                    // LÓGICA DE IMAGEM AUTOMÁTICA
                    // Pega a imagem correspondente ao índice. Se acabar, recomeça do zero (loop).
                    const imageSrc = SITE_CONFIG.images.services && SITE_CONFIG.images.services.length > 0 
                        ? SITE_CONFIG.images.services[index % SITE_CONFIG.images.services.length] 
                        : SITE_CONFIG.images.logo; // Fallback se não tiver imagens de serviço

                    // LÓGICA DE PREÇO AUTOMÁTICO
                    const formattedPrice = service.price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

                    return (
                        <motion.div
                            key={index}
                            variants={itemVariants}
                            className="group relative bg-zinc-900/40 backdrop-blur-md rounded-[2rem] border border-white/5 hover:border-pink-500/30 transition-all duration-300 overflow-hidden hover:shadow-2xl"
                        >
                            <div className="h-56 md:h-64 relative overflow-hidden">
                                <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-transparent to-transparent z-10 opacity-90" />
                                <img 
                                    src={imageSrc} 
                                    alt={service.title} 
                                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out grayscale group-hover:grayscale-0" 
                                />
                                <div className="absolute top-4 right-4 z-20">
                                    <span className="bg-black/60 backdrop-blur-md border border-white/10 px-3 py-1 rounded-full text-[10px] font-bold uppercase text-white tracking-wider shadow-lg">PRESENCIAL</span>
                                </div>
                            </div>

                            <div className="p-6 md:p-8 relative z-20 -mt-20">
                                <h3 className="text-xl md:text-2xl font-bold text-white mb-2 drop-shadow-lg group-hover:text-pink-400 transition-colors">{service.title}</h3>
                                <p className="text-xs md:text-sm text-zinc-300 mb-6 line-clamp-2 leading-relaxed h-8 md:h-10 drop-shadow-md opacity-80 group-hover:opacity-100">{service.description}</p>
                                
                                <div className="flex items-center justify-between mb-6 pb-6 border-b border-white/10">
                                    <div className="flex items-center gap-2 text-zinc-300 text-[10px] md:text-xs uppercase font-bold tracking-wider bg-white/5 px-3 py-1.5 rounded-lg border border-white/5">
                                        <Clock size={14} className="text-pink-500" /> {service.duration}
                                    </div>
                                    <div className="text-xl md:text-2xl font-bold text-white flex items-baseline gap-1">
                                        <span className="text-xs text-zinc-500 font-normal">R$</span>{service.price.toFixed(2)}
                                    </div>
                                </div>
                                
                                <BookingModal serviceName={service.title} price={formattedPrice}>
                                    <button className="w-full bg-white text-black hover:bg-pink-500 hover:text-white font-bold py-3 md:py-4 rounded-xl transition-all flex items-center justify-center gap-2 active:scale-95 text-xs md:text-sm uppercase tracking-wide">
                                        {SITE_CONFIG.text.scheduleTitle} <MapPin size={14} />
                                    </button>
                                </BookingModal>
                            </div>
                        </motion.div>
                    );
                })}
                </div>
            </motion.section>
        )}
      </AnimatePresence>

      {/* --- RODAPÉ --- */}
      <footer className="bg-zinc-950/80 backdrop-blur-lg border-t border-white/5 pt-16 pb-10 relative z-10 mt-auto">
        <div className="max-w-6xl mx-auto px-4 grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
            
            <div className="text-center md:text-left flex flex-col items-center md:items-start">
                <div className="flex items-center gap-3 text-white font-black text-2xl mb-4 tracking-tighter">
                    {SITE_CONFIG.name}
                </div>
                <p className="text-zinc-500 leading-relaxed text-sm max-w-sm mb-6">
                    {SITE_CONFIG.text.footerMessage}
                </p>
                <div className="flex items-center gap-3 mt-2">
                    {SITE_CONFIG.links.maps && (
                        <a href={SITE_CONFIG.links.maps} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 hover:border-pink-500/50 hover:text-pink-400 px-4 py-2 rounded-full text-xs font-medium text-zinc-400 transition-all cursor-pointer shadow-sm">
                            <MapPin size={14} /> Localização
                        </a>
                    )}
                </div>
            </div>

            <div className="flex flex-col items-center md:items-end w-full">
                <div className="w-full max-w-[320px]">
                    <h4 className="text-white font-bold mb-4 text-xs md:text-sm uppercase tracking-wider text-center">
                        Precisa de Ajuda?
                    </h4>
                    
                    <a href={`https://wa.me/${SITE_CONFIG.whatsappNumber}?text=${whatsappMessage}`} target="_blank" rel="noopener noreferrer" className="group relative w-full bg-zinc-900/50 hover:bg-zinc-900 border border-white/5 hover:border-green-500/30 p-5 rounded-3xl transition-all duration-300 overflow-hidden cursor-pointer block">
                        <div className="absolute inset-0 bg-green-500/0 group-hover:bg-green-500/5 transition-colors duration-500" />
                        <div className="relative z-10 flex items-center justify-between">
                            <div className="flex flex-col justify-center text-left">
                                 <p className="text-[10px] md:text-xs text-zinc-400 font-medium uppercase tracking-wider mb-1">Suporte Online</p>
                                 <p className="text-base md:text-lg font-bold text-white group-hover:text-green-400 transition-colors tracking-tight leading-tight">Nos chame no WhatsApp</p>
                            </div>
                            <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-green-600 flex items-center justify-center text-white shadow-lg shadow-green-900/20 group-hover:scale-110 group-hover:rotate-12 transition-all duration-300 shrink-0 ml-3">
                                 <WhatsAppIcon className="w-5 h-5 md:w-6 md:h-6 fill-current" />
                            </div>
                        </div>
                        <p className="relative z-10 mt-2 text-xs md:text-sm text-zinc-500 group-hover:text-zinc-400 transition-colors font-mono text-left">{SITE_CONFIG.whatsappDisplay}</p>
                        <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300 transform translate-x-2 -translate-y-2 group-hover:translate-x-0 group-hover:translate-y-0">
                             <ArrowUpRight size={14} className="text-green-500" />
                        </div>
                    </a>
                </div>
            </div>
        </div>
        
        <div className="border-t border-white/5 pt-8 text-center px-4 mt-8">
            <p className="text-zinc-600 text-[10px] md:text-xs font-medium">© {new Date().getFullYear()} {SITE_CONFIG.name}. Todos os direitos reservados.</p>
        </div>
      </footer>
    </div>
  );
}