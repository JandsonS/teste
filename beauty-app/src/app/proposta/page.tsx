"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Check, X, Zap, MessageCircle, ShieldCheck, Rocket } from "lucide-react";

export default function PricingPage() {
  const whatsappNumber = "5587991537080"; // Seu número
  
  // ESTADO: Começa com 'Anual' selecionado
  const [activePlan, setActivePlan] = useState("Anual");

  const handleContact = (plan: string, price: string) => {
    const message = encodeURIComponent(`Olá! Tenho interesse no plano *${plan}* de *${price}*. Poderia me informar como podemos prosseguir com a contratação?`);
    window.open(`https://wa.me/${whatsappNumber}?text=${message}`, '_blank');
  };

  const plans = [
    {
      name: "Mensal",
      price: "R$ 50",
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
      badge: null, // Sem badge
      icon: Zap,
      buttonText: "Assinar Mensal",
    },
    {
      name: "Anual",
      price: "R$ 500",
      period: "/ano",
      adesao: "Adesão Grátis",
      description: "Economia de 2 meses + Isenção da taxa de instalação.",
      features: [
        "Tudo do Plano Mensal",
        "Adesão ZERO (Economize R$ 100)",
        "2 Meses Grátis (Economize R$ 100)",
        "Prioridade no Suporte",
        "Setup Inicial Completo"
      ],
      notIncluded: ["Domínio Próprio (.com.br)"],
      badge: "Melhor Custo-Benefício", // Badge fixo neste plano
      icon: Rocket,
      buttonText: "Quero Desconto",
    },
    {
      name: "Vitalício",
      price: "R$ 1.500",
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
      notIncluded: ["Hospedagem após 1 ano", "Atualizações futuras"],
      badge: null,
      icon: ShieldCheck,
      buttonText: "Comprar Sistema",
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
          Escolha o plano ideal para o seu <span className="text-emerald-500">Negócio</span>
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

      {/* GRID INTERATIVO */}
      {/* onMouseLeave no pai faz voltar para o Anual quando sai da área */}
      <div 
        className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-7xl w-full"
        onMouseLeave={() => setActivePlan("Anual")} 
      >
        {plans.map((plan, index) => {
          // Verifica se este é o plano ativo
          const isActive = activePlan === plan.name;

          return (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 50 }}
              animate={{ 
                opacity: 1, 
                y: 0,
                scale: isActive ? 1.05 : 1, // Cresce se estiver ativo
                zIndex: isActive ? 10 : 1   // Fica por cima se estiver ativo
              }}
              transition={{ delay: index * 0.1, duration: 0.3 }}
              
              // EVENTOS MÁGICOS AQUI 👇
              onMouseEnter={() => setActivePlan(plan.name)} // Desktop
              onClick={() => setActivePlan(plan.name)}      // Mobile (Toque seleciona)
              
              className={`
                relative flex flex-col p-8 rounded-3xl border transition-colors duration-300 cursor-default
                ${isActive 
                  ? 'bg-zinc-900/90 border-emerald-500 shadow-[0_0_40px_rgba(16,185,129,0.2)]' // Estilo Ativo
                  : 'bg-zinc-950/50 border-white/10 opacity-70 hover:opacity-100' // Estilo Inativo
                }
              `}
            >
              {/* Badge Fixo (Só aparece se o plano tiver badge, ex: Anual) */}
              {plan.badge && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-emerald-500 text-black font-bold text-xs uppercase px-4 py-1 rounded-full shadow-lg whitespace-nowrap">
                  {plan.badge}
                </div>
              )}

              <div className="mb-6">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-4 transition-colors ${isActive ? 'bg-emerald-500 text-black' : 'bg-zinc-800 text-zinc-400'}`}>
                  <plan.icon size={24} />
                </div>
                <h3 className={`text-xl font-bold mb-2 transition-colors ${isActive ? 'text-white' : 'text-zinc-300'}`}>{plan.name}</h3>
                <p className="text-zinc-400 text-sm h-10">{plan.description}</p>
              </div>

              <div className="mb-6 pb-6 border-b border-white/5">
                <div className="flex items-baseline gap-1">
                  <span className="text-sm text-zinc-500 font-bold">R$</span>
                  <span className={`text-4xl font-black transition-colors ${isActive ? 'text-white' : 'text-zinc-500'}`}>{plan.price}</span>
                  <span className="text-zinc-500 font-bold">{plan.period}</span>
                </div>
                <p className={`text-xs font-bold mt-2 uppercase tracking-wide ${plan.name === 'Anual' ? 'text-emerald-400' : 'text-zinc-600'}`}>
                  {plan.adesao}
                </p>
              </div>

              <div className="flex-1 space-y-4 mb-8">
                {plan.features.map((feature, i) => (
                  <div key={i} className="flex items-start gap-3 text-sm text-zinc-300">
                    <Check size={16} className={`mt-0.5 shrink-0 transition-colors ${isActive ? 'text-emerald-500' : 'text-zinc-600'}`} />
                    <span>{feature}</span>
                  </div>
                ))}
                {plan.notIncluded.map((item, i) => (
                  <div key={i} className="flex items-start gap-3 text-sm text-zinc-600 opacity-50">
                    <X size={16} className="mt-0.5 shrink-0" />
                    <span className="line-through">{item}</span>
                  </div>
                ))}
              </div>

              <button
                onClick={(e) => {
                  e.stopPropagation(); // Evita conflito com o click do card
                  handleContact(plan.name, plan.price);
                }}
                className={`
                  w-full py-4 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2
                  ${isActive 
                    ? 'bg-emerald-500 hover:bg-emerald-400 text-black shadow-lg shadow-emerald-900/20 transform hover:-translate-y-1' 
                    : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                  }
                `}
              >
                <MessageCircle size={18} />
                {plan.buttonText}
              </button>

            </motion.div>
          );
        })}
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