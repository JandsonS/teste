import { ServiceCard } from "@/components/service-card";

export default function Home() {
  return (
    <main className="min-h-screen pb-20">
      {/* Cabeçalho / Hero Section */}
      <div className="relative pt-20 pb-16 text-center px-4 overflow-hidden">
         {/* Efeito de luz de fundo */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-pink-600/20 blur-[100px] -z-10 rounded-full"></div>
        
        <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight mb-4 bg-gradient-to-b from-white to-zinc-400 bg-clip-text text-transparent">
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
          
          <ServiceCard 
            title="Design de Sobrancelha"
            price="R$ 45,00"
            duration="45 min"
            type="Presencial"
            imageUrl="https://images.unsplash.com/photo-1616683693504-3ea7e9ad6fec?q=80&w=600&auto=format&fit=crop"
          />
          
          <ServiceCard 
            title="Micropigmentação"
            price="R$ 350,00"
            duration="120 min"
            type="Presencial"
            imageUrl="https://images.unsplash.com/photo-1588066692676-72e3597f978e?q=80&w=600&auto=format&fit=crop"
          />

          <ServiceCard 
            title="Lash Lifting"
            price="R$ 120,00"
            duration="60 min"
            type="Presencial"
            imageUrl="https://images.unsplash.com/photo-1587753510587-c4f8952824d7?q=80&w=600&auto=format&fit=crop"
          />

           {/* Adicione outros serviços aqui */}

        </div>
      </section>
    </main>
  );
}