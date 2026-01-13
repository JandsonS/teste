"use client";

interface ServiceProps {
  title: string;
  price: string;
  duration: string;
  imageUrl?: string;
  type?: string;
}

export function ServiceCard({ title, price, duration, imageUrl, type }: ServiceProps) {
  
  // --- LÓGICA DE PAGAMENTO (RESTAURADA) ---
  const handleAgendar = async () => {
    // Converte o preço de texto (R$ 45,00) para número (45.00)
    const numericPrice = parseFloat(price.replace("R$", "").replace(",", ".").trim());

    try {
      const response = await fetch('/api/payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: title,
          price: numericPrice
        }),
      });

      const data = await response.json();

      if (data.url) {
        // Redireciona o usuário para o Mercado Pago
        window.location.href = data.url;
      } else {
        alert("Erro ao criar preferência de pagamento.");
      }
    } catch (error) {
      console.error(error);
      alert("Erro de conexão ao tentar pagar.");
    }
  };

  // --- VISUAL NOVO (GLASSMORPHISM) ---
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-1 backdrop-blur-lg transition-all hover:border-pink-500/50 hover:shadow-2xl hover:shadow-pink-500/10">
      
      {/* Efeito de brilho no fundo ao passar o mouse */}
      <div className="absolute inset-0 -z-10 bg-gradient-to-br from-pink-500/0 via-pink-500/0 to-pink-500/0 transition-all group-hover:from-pink-500/10 group-hover:via-pink-500/5 group-hover:to-pink-500/0 opacity-0 group-hover:opacity-100 duration-500" />

      <div className="rounded-xl bg-zinc-900/80 p-4 h-full flex flex-col justify-between">
        <div>
          {/* Imagem com zoom suave */}
          {imageUrl && (
            <div className="overflow-hidden rounded-lg mb-4">
              <img 
                src={imageUrl} 
                alt={title} 
                className="w-full h-40 object-cover transform transition-transform duration-500 group-hover:scale-110"
              />
            </div>
          )}

          {/* Título e Tipo */}
          <div className="flex justify-between items-start mb-2">
            <h3 className="font-bold text-xl text-white">{title}</h3>
            {type && <span className="text-[10px] uppercase tracking-wider border border-pink-500/30 text-pink-300 px-2 py-1 rounded-full">{type}</span>}
          </div>

          {/* Duração e Preço */}
          <div className="flex items-center justify-between mt-4">
            <div className="text-zinc-400 text-sm flex items-center gap-1 bg-zinc-800/50 px-3 py-1.5 rounded-lg">
              <span>⏱ {duration}</span>
            </div>
            <span className="text-2xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-pink-200 to-pink-500">
              {price}
            </span>
          </div>
        </div>

        {/* Botão de Agendar (Agora chama a função handleAgendar) */}
        <button 
          onClick={handleAgendar}
          className="mt-6 w-full relative overflow-hidden rounded-xl bg-gradient-to-r from-pink-600 to-rose-600 px-4 py-3 text-sm font-bold text-white shadow-lg transition-transform active:scale-[0.98] hover:shadow-pink-500/25"
        >
            <span className="relative z-10 flex items-center justify-center gap-2">
              Agendar Horário
            </span>
        </button>
      </div>
    </div>
  );
}