import { ServiceCard } from "@/components/service-card";
import { SERVICES } from "@/constants/services"; // Importa nossa lista

export default function Home() {
  return (
    <main className="min-h-screen pb-20">
      {/* Cabeçalho / Hero Section */}
      <div className="relative pt-20 pb-16 text-center px-4 overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-pink-600/20 blur-[100px] -z-10 rounded-full"></div>
        
        <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight mb-4 bg-gradient-to-b from-white to-zinc-400 bg-clip-text text-transparent">
          Realce sua <span className="text-pink-500">beleza única</span>
        </h1>
        <p className="text-lg text-zinc-400 max-w-xl mx-auto leading-relaxed">
          Procedimentos exclusivos e atendimento personalizado. Escolha seu serviço abaixo e agende em segundos.
        </p>
      </div>

      {/* Grade de Serviços Automática */}
      <section className="container mx-auto px-4 max-w-5xl">
        <h2 className="text-2xl font-bold mb-8 border-l-4 border-pink-500 pl-4 flex items-center gap-2">
          Nossos Procedimentos
        </h2>
        
        {/* Aqui acontece a mágica: O Map cria um card para cada item da lista */}
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
    </main>
  );
}