"use client";

import { motion } from "framer-motion";
import { Check, X, Zap, MessageCircle, ShieldCheck, Rocket } from "lucide-react";
import { SITE_CONFIG } from "@/constants/info"; // Para pegar seu número de whats

export default function PricingPage() {
  // Substitua pelo seu número real se não estiver no config
  const whatsappNumber = "558791537080"; 
  
  const handleContact = (plan: string, price: string) => {
    const message = encodeURIComponent(`Olá! Vi a proposta e tenho interesse no plano *${plan}* de *${price}*. Como podemos fechar?`);
    window.open(`https://wa.me/${whatsappNumber}?text=${message}`, '_blank');
  };

  const plans = [
    {
      name: "Mensal",
      price: "50",
      period: "/mês",
      adesao: "R$ 100 adesão (única)",
      description: "Ideal para começar sem pesar no bolso.",
      features: [
        "Sistema de Agendamento Completo",
        "Painel Administrativo",
        "Controle Financeiro",
        "Carrinho de Serviços (Upsell)",
        "Suporte via WhatsApp",
        "Hospedagem Inclusa"
      ],
      notIncluded: ["Domínio Próprio (.com.br)"],
      highlight: false,
      icon: Zap,
      buttonText: "Assinar Mensal",
      color: "zinc"
    },
    {
      name: "Anual",
      price: "500",
      period: "/ano",
      adesao: "Adesão Grátis", // Oferta irresistível
      description: "Economia de 2 meses + Isenção da taxa de instalação.",
      features: [
        "Tudo do Plano Mensal",
        "Adesão ZERO (Economize R$ 100)",
        "2 Meses Grátis (Economize R$ 100)",
        "Prioridade no Suporte",
        "Setup Inicial Completo"
      ],
      notIncluded: ["Domínio Próprio (.com.br)"],
      highlight: true, // O "Mais Vendido"
      icon: Rocket,
      buttonText: "Quero Desconto",
      color: "emerald"
    },
    {
      name: "Vitalício",
      price: "1.500",
      period: "único",
      adesao: "Sem mensalidade",
      description: "Para quem quer ser dono do próprio sistema.",
      features: [
        "Acesso Vitalício ao Sistema",
        "Sem Mensalidades",
        "Instalação no seu Servidor",
        "3 Meses de Suporte Grátis",
        "Código Otimizado"
      ],
      notIncluded: ["Hospedagem após 1 ano", "Atualizações futuras"], // Importante deixar claro
      highlight: false,
      icon: ShieldCheck,
      buttonText: "Comprar Sistema",
      color: "purple"
    }
  ];

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-zinc-100 py-20 px-4 flex flex-col items-center justify-center">
      
      {/* CABEÇALHO */}
      <div className="text-center max-w-2xl mx-auto mb-16 space-y-4">
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="inline-block px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold uppercase tracking-widest mb-4"
        >
          Planos e Preços
        </motion.div>
        <motion.h1 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-4xl md:text-5xl font-black tracking-tight text-white"
        >
          Escolha o plano ideal para sua <span className="text-emerald-500">Barbearia</span>
        </motion.h1>
        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-zinc-400 text-lg"
        >
          Pare de perder dinheiro com faltas e organize sua agenda automaticamente.
        </motion.p>
      </div>

      {/* CARDS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-7xl w-full">
        {plans.map((plan, index) => (
          <motion.div
            key={plan.name}
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 + 0.3 }}
            className={`
              relative flex flex-col p-8 rounded-3xl border transition-all duration-300 group
              ${plan.highlight 
                ? 'bg-zinc-900/80 border-emerald-500 shadow-[0_0_50px_rgba(16,185,129,0.15)] scale-105 z-10' 
                : 'bg-zinc-950/50 border-white/10 hover:border-zinc-700 hover:bg-zinc-900/50'
              }
            `}
          >
            {plan.highlight && (
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-emerald-500 text-black font-bold text-xs uppercase px-4 py-1 rounded-full shadow-lg">
                Melhor Custo-Benefício
              </div>
            )}

            <div className="mb-6">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-4 ${plan.highlight ? 'bg-emerald-500 text-black' : 'bg-zinc-800 text-zinc-400'}`}>
                <plan.icon size={24} />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">{plan.name}</h3>
              <p className="text-zinc-400 text-sm h-10">{plan.description}</p>
            </div>

            <div className="mb-6 pb-6 border-b border-white/5">
              <div className="flex items-baseline gap-1">
                <span className="text-sm text-zinc-500 font-bold">R$</span>
                <span className={`text-4xl font-black ${plan.highlight ? 'text-white' : 'text-zinc-200'}`}>{plan.price}</span>
                <span className="text-zinc-500 font-bold">{plan.period}</span>
              </div>
              <p className={`text-xs font-bold mt-2 uppercase tracking-wide ${plan.name === 'Anual' ? 'text-emerald-400' : 'text-zinc-500'}`}>
                {plan.adesao}
              </p>
            </div>

            <div className="flex-1 space-y-4 mb-8">
              {plan.features.map((feature, i) => (
                <div key={i} className="flex items-start gap-3 text-sm text-zinc-300">
                  <Check size={16} className={`mt-0.5 shrink-0 ${plan.highlight ? 'text-emerald-500' : 'text-zinc-600'}`} />
                  <span>{feature}</span>
                </div>
              ))}
              {plan.notIncluded.map((item, i) => (
                <div key={i} className="flex items-start gap-3 text-sm text-zinc-600 opacity-60">
                  <X size={16} className="mt-0.5 shrink-0" />
                  <span className="line-through">{item}</span>
                </div>
              ))}
            </div>

            <button
              onClick={() => handleContact(plan.name, plan.price)}
              className={`
                w-full py-4 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2
                ${plan.highlight 
                  ? 'bg-emerald-500 hover:bg-emerald-400 text-black shadow-lg shadow-emerald-900/20' 
                  : 'bg-white text-black hover:bg-zinc-200'
                }
              `}
            >
              <MessageCircle size={18} />
              {plan.buttonText}
            </button>

          </motion.div>
        ))}
      </div>

      <div className="mt-16 text-center max-w-lg">
        <p className="text-zinc-500 text-xs">
          * Domínio personalizado (.com.br) deve ser adquirido separadamente pelo cliente (aprox. R$ 40/ano no Registro.br). 
          A configuração técnica é gratuita em todos os planos mensais e anuais.
        </p>
      </div>
    </div>
  );
}