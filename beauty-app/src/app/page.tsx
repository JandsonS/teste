import { ServiceCard } from "@/components/service-card"
import { Sparkles, CalendarHeart } from "lucide-react"

export default function Home() {
  // Dados com imagens funcionais
  const services = [
    {
      title: "Design de Sobrancelha",
      price: "R$ 45,00",
      duration: "45 min",
      type: "presencial" as const,
      // Usando imagens do Placehold.co que nunca quebram, ou links estáveis
      imageUrl: "https://images.unsplash.com/photo-1615526675159-e248c3021d3f?w=800&auto=format&fit=crop&q=60"
    },
    {
      title: "Alongamento de Cílios",
      price: "R$ 40,00",
      duration: "100 min",
      type: "presencial" as const,
      imageUrl: "https://www.maybelline.com.br/-/media/project/loreal/brand-sites/mny/americas/br/artigos/2024/olhos/categoria-pai/volume-brasileiro/extensao-cilios.jpg?rev=dd3d34832430435c8e4fa468d6ebedf1&cx=0.49&cy=0.39&cw=650&ch=650&hash=7042D72335BE45CC570658DF20F77784"
    },
    {
      title: "Mentoria de Marketing",
      price: "R$ 150,00",
      duration: "60 min",
      type: "online" as const,
      imageUrl: "https://images.unsplash.com/photo-1556761175-5973dc0f32e7?w=800&auto=format&fit=crop&q=60"
    },
    {
      title: "Limpeza de Pele",
      price: "R$ 90,00",
      duration: "50 min",
      type: "presencial" as const,
      imageUrl: "https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=800&auto=format&fit=crop&q=60"
    }
  ]

  return (
    <main className="min-h-screen bg-gray-50 pb-20">
      {/* Header Bonito e Largo */}
      <div className="bg-gradient-to-r from-rose-900 to-rose-800 text-white py-16 px-6 shadow-xl mb-10">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2 text-rose-300 font-semibold uppercase tracking-wider text-sm">
              <Sparkles className="w-4 h-4" /> Realce sua beleza
            </div>
            <h1 className="text-4xl md:text-6xl font-bold mb-4">Studio Beauty</h1>
            <p className="text-rose-100 text-lg max-w-lg">
              Agende seus procedimentos favoritos em segundos e receba atendimento exclusivo.
            </p>
          </div>
          <div className="hidden md:block bg-white/10 p-4 rounded-full">
            <CalendarHeart className="w-16 h-16 text-rose-200" />
          </div>
        </div>
      </div>

      {/* Grid Responsivo de Serviços */}
      <div className="max-w-6xl mx-auto px-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-6 border-l-4 border-rose-600 pl-4">
          Nossos Serviços
        </h2>

        {/* A MÁGICA DA RESPONSIVIDADE ESTÁ AQUI EMBAIXO: grid-cols-1 (celular) até grid-cols-3 (PC) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {services.map((service, index) => (
            <ServiceCard 
              key={index}
              title={service.title}
              price={service.price}
              duration={service.duration}
              type={service.type}
              imageUrl={service.imageUrl}
            />
          ))}
        </div>
      </div>
      
      {/* Footer */}
      <div className="text-center text-gray-400 text-sm mt-20 border-t py-8">
        © 2026 Studio App Exemplo - Feito Por Eng. Software José Jandson
      </div>
    </main>
  )
}