export const SITE_CONFIG = {
  // 1. DADOS DA EMPRESA
  name: "BARBEARIA TESTE",
  description: "Realce sua beleza única com nossos procedimentos exclusivos.",
  url: "https://teste-drab-rho-60.vercel.app", 
  
  // 2. SENHA DO ADMIN
  adminPassword: "admin123", 
  
  // 3. WHATSAPP
  whatsappNumber: "558189015555", 
  whatsappDisplay: "(81) 98901-5555", 

  // 4. TEXTOS PERSONALIZÁVEIS (Adicionado para corrigir o erro na Home)
  text: {
    servicesTitle: "Nossos Procedimentos", 
    scheduleTitle: "Agendar Horário",
    footerMessage: "Atendimento com hora marcada para sua comodidade.",
    whatsappBtn: "Dúvidas? Chame no Zap"
  },

  // 5. LINKS (Adicionado para evitar erros de leitura)
  links: {
    instagram: "https://instagram.com", 
    maps: "https://www.google.com/maps/place/Av.+Zeferino+Galv%C3%A3o+-+Centro,+Arcoverde+-+PE,+56506-400/@-8.4189164,-37.0549248,916m/data=!3m2!1e3!4b1!4m6!3m5!1s0x7a81be8201c4fa7:0x5cbfd760accec143!8m2!3d-8.4189164!4d-37.0523499!16s%2Fg%2F1ymv2qv2j?entry=ttu&g_ep=EgoyMDI2MDExMy4wIKXMDSoKLDEwMDc5MjA3M0gBUAM%3D"
  },

  // 6. IMAGENS
  images: {
    logo: "https://t4.ftcdn.net/jpg/02/32/92/55/360_F_232925587_st4gM8b3TJHtjjddCIUNyVyFJmZqMmn4.jpg", 
    heroBg: "https://t4.ftcdn.net/jpg/02/32/92/55/360_F_232925587_st4gM8b3TJHtjjddCIUNyVyFJmZqMmn4.jpg", 
    services: [
      "https://images.unsplash.com/photo-1560066984-138dadb4c035?q=80&w=800&auto=format&fit=crop",
      "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQDqORRuhVUq1gBIpKrWxoKSeU2tCVcO1xjJA&s",
      "https://images.unsplash.com/photo-1621605815971-fbc98d665033?q=80&w=800&auto=format&fit=crop",
      "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTSA2K0LM2YkwT5pFWoLDaplmCFmF4IYTTS4Q&s",
    ]
  }
};


export const BUSINESS_HOURS = {
  start: 9, 
  end: 19   
};

export const SERVICES = [
  {
    title: "Corte de Cabelo (Teste)",
    price: 1.00, // Alterei para 5.00 para testar o pix real (mínimo de alguns bancos), mas pode manter 1.00 se preferir
    duration: "45 min",
    description: "Corte moderno com finalização."
  },
  {
    title: "Barba Completa (Teste)",
    price: 1.00,
    duration: "30 min",
    description: "Modelagem e hidratação com toalha quente."
  },
  {
    title: "Combo (Corte + Barba)",
    price: 1.00,
    duration: "1h 15min",
    description: "O serviço completo com desconto."
  },
  {
    title: "Sobrancelha (Teste)",
    price: 1.00,
    duration: "15 min",
    description: "Design e limpeza dos fios."
  }
];