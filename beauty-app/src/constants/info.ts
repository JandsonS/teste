export const SITE_CONFIG = {
  // 1. DADOS DA EMPRESA
  name: "Teste ",
  description: "Realce sua beleza única com nossos procedimentos exclusivos.",
  url: "https://teste-drab-rho-60.vercel.app", 
  // 2. SENHA DO ADMIN
  adminPassword: "jandson", // <--- TROQUE ESSA SENHA DEPOIS
  // 3. WHATSAPP
  whatsappNumber: "558189015555", 
  whatsappDisplay: "(81) 98901-5555", 

  // 4. IMAGENS (Adicionamos o campo LOGO aqui)
  images: {
    // Coloque aqui o link da logo do cliente (pode ser quadrada ou redonda)
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
    price: 5.00,
    duration: "45 min",
    description: "Corte moderno com finalização."
  },
  {
    title: "Barba Completa (Teste)",
    price: 5.00,
    duration: "30 min",
    description: "Modelagem e hidratação com toalha quente."
  },
  {
    title: "Combo (Corte + Barba)",
    price: 5.00,
    duration: "1h 15min",
    description: "O serviço completo com desconto."
  },
  {
    title: "Sobrancelha (Teste)",
    price: 5.00,
    duration: "15 min",
    description: "Design e limpeza dos fios."
  }
];

