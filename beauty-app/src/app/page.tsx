"use client";

import { motion } from 'framer-motion';
import { Clock, Star, Phone } from 'lucide-react';
import { SERVICES, SITE_CONFIG } from '@/constants/info';
import { BookingModal } from "@/components/booking-modal"; 

export default function Home() {
  // Note que apaguei todos os "states" (date, step, modalOpen...)
  // Porque agora quem cuida disso é o componente AgendamentoModal

  return (
    <div className="min-h-screen bg-[#050505] text-zinc-100 font-sans selection:bg-pink-500/30">
      
      {/* --- HERO SECTION --- */}
      <section className="relative h-[400px] flex flex-col items-center justify-center text-center px-4 bg-zinc-900 overflow-hidden">
        <div className="absolute inset-0 opacity-40">
           <img 
             src={SITE_CONFIG.images.heroBg} 
             alt="Background" 
             className="w-full h-full object-cover"
           />
           <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#050505]/80 to-[#050505]" />
        </div>
        
        <div className="relative z-10 space-y-4">
            <div className="w-24 h-24 mx-auto bg-white/10 backdrop-blur-md rounded-full flex items-center justify-center border border-white/20 mb-4 shadow-2xl shadow-pink-500/20 overflow-hidden p-1">
                {SITE_CONFIG.images.logo ? (
                  <img src={SITE_CONFIG.images.logo} alt="Logo" className="w-full h-full object-cover rounded-full" />
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
                    
                    {/* AQUI ESTÁ A MÁGICA: Usamos o Componente Novo para envolver o botão */}
                    <BookingModal serviceName={service.title} price={`R$ ${service.price.toFixed(2)}`}>
                        <button className="w-full bg-pink-600 hover:bg-pink-700 text-white font-bold py-3 rounded-xl transition-colors flex items-center justify-center gap-2">
                            Agendar Horário
                        </button>
                    </BookingModal>

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

      {/* APAGUEI O MODAL GIGANTE QUE FICAVA AQUI EMBAIXO */}
    </div>
  );
}