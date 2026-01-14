import { ServiceCard } from "@/components/service-card";
import { SERVICES } from "@/constants/services";
import { Footer } from "@/components/footer"; // <--- 1. Importamos o Footer

export default function Home() {
  return (
    // Mudei pb-20 para pb-0 para o rodapé ficar colado no fundo
    <main className="min-h-screen pb-0">
      
      {/* Cabeçalho / Hero Section */}
      {/* Adicionei 'flex flex-col items-center' para alinhar o Logo */}
      <div className="relative pt-16 pb-16 text-center px-4 overflow-hidden flex flex-col items-center">
        
        {/* Efeito de luz de fundo */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-pink-600/20 blur-[100px] -z-10 rounded-full"></div>
        
        {/* --- LOGO DO SITE (Puxando da pasta public) --- */}
        <div className="mb-8 relative w-48 h-48 md:w-64 md:h-64 animate-in fade-in zoom-in duration-1000">
           <img 
             src="/logo.png" 
             alt="Logo Studio" 
             className="object-contain w-full h-full drop-shadow-2xl"
           />
        </div>
        
        <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight mb-4 bg-gradient-to-b from-white to-zinc-400 bg-clip-text text-transparent">
          Realce sua <span className="text-pink-500">beleza única</span>
        </h1>
        <p className="text-lg text-zinc-400 max-w-xl mx-auto leading-relaxed">
          Procedimentos exclusivos e atendimento personalizado. Escolha seu serviço abaixo e agende em segundos.
        </p>
      </div>

      {/* Grade de Serviços */}
      <section className="container mx-auto px-4 max-w-5xl">
        <h2 className="text-2xl font-bold mb-8 border-l-4 border-pink-500 pl-4 flex items-center gap-2">
          Nossos Procedimentos
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {SERVICES.map((service) => (
            <ServiceCard 
              key={service.id}
              title={service.title}
              price={service.price}
              duration={service.duration}
              type={service.type}
              imageUrl={service.imageUrl}
            />
          ))}
        </div>
      </section>

      {/* 2. O NOVO RODAPÉ AQUI NO FINAL */}
      <Footer />

    </main>
  );
}