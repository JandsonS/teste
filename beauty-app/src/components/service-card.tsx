"use client";

interface ServiceProps {
  title: string;
  price: string;
  duration: string;
  imageUrl?: string;
  type?: string;
}

export function ServiceCard({ title, price, duration, imageUrl, type }: ServiceProps) {
  
  const handleAgendar = async () => {
    // (MANTENHA A MESMA LÓGICA DE ANTES AQUI - CÓDIGO OMITIDO PARA OCUPAR MENOS ESPAÇO)
    // Se precisar, copie a lógica do handleAgendar da sua versão anterior
    alert("Lógica de pagamento será acionada para: " + title);
  };

  return (
    // MUDANÇA VISUAL PRINCIPAL AQUI:
    <div className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-1 backdrop-blur-lg transition-all hover:border-pink-500/50 hover:shadow-2xl hover:shadow-pink-500/10">
      
      {/* Efeito de brilho no fundo ao passar o mouse */}
      <div className="absolute inset-0 -z-10 bg-gradient-to-br from-pink-500/0 via-pink-500/0 to-pink-500/0 transition-all group-hover:from-pink-500/10 group-hover:via-pink-500/5 group-hover:to-pink-500/0 opacity-0 group-hover:opacity-100 duration-500" />

      <div className="rounded-xl bg-zinc-900/80 p-4 h-full flex flex-col justify-between">
        <div>
          {/* Imagem com zoom suave ao passar o mouse */}
          {imageUrl && (
            <div className="overflow-hidden rounded-lg mb-4">
              <img 
                src={imageUrl} 
                alt={title} 
                className="w-full h-40 object-cover transform transition-transform duration-500 group-hover:scale-110"
              />
            </div>
          )}

          {/* Título e Preço */}
          <div className="flex justify-between items-start mb-2">
            <h3 className="font-bold text-xl text-white">{title}</h3>
            {type && <span className="text-[10px] uppercase tracking-wider border border-pink-500/30 text-pink-300 px-2 py-1 rounded-full">{type}</span>}
          </div>

          {/* Duração e Preço */}
          <div className="flex items-center justify-between mt-4">
            <div className="text-zinc-400 text-sm flex items-center gap-1 bg-zinc-800/50 px-3 py-1.5 rounded-lg">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-pink-400">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm.75-13a.75.75 0 00-1.5 0v5c0 .414.336.75.75.75h4a.75.75 0 000-1.5h-3.25V5z" clipRule="evenodd" />
              </svg>
              {duration}
            </div>
            <span className="text-2xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-pink-200 to-pink-500">
              {price}
            </span>
          </div>
        </div>

        {/* Botão Moderno */}
        <button 
          onClick={handleAgendar}
          className="mt-6 w-full relative overflow-hidden rounded-xl bg-gradient-to-r from-pink-600 to-rose-600 px-4 py-3 text-sm font-bold text-white shadow-lg transition-transform active:scale-[0.98] hover:shadow-pink-500/25"
        >
            <span className="relative z-10 flex items-center justify-center gap-2">
              Agendar Horário
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                <path fillRule="evenodd" d="M3 10a.75.75 0 01.75-.75h10.638L10.23 5.29a.75.75 0 111.04-1.08l5.5 5.5a.75.75 0 010 1.08l-5.5 5.5a.75.75 0 11-1.04-1.08l4.158-3.96H3.75A.75.75 0 013 10z" clipRule="evenodd" />
              </svg>
            </span>
        </button>
      </div>
    </div>
  );
}