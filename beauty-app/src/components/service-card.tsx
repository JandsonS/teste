"use client"; 

// 1. AQUI FOI A MUDANÇA: Adicionamos o 'type' na lista de coisas permitidas
interface ServiceProps {
  title: string;
  price: string;
  duration: string;
  imageUrl?: string;
  type?: string; // <--- Essa linha resolve o erro!
}

export function ServiceCard({ title, price, duration, imageUrl, type }: ServiceProps) {
  
  const handleAgendar = async () => {
    // Lógica do pagamento...
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
        window.location.href = data.url;
      } else {
        alert("Erro ao criar pagamento");
      }
    } catch (error) {
      console.error(error);
      alert("Erro de conexão.");
    }
  };

  return (
    <div className="border border-zinc-800 bg-zinc-900/50 rounded-xl p-4 flex flex-col gap-3 hover:border-pink-500/50 transition-colors">
      {imageUrl && (
        <img 
          src={imageUrl} 
          alt={title} 
          className="w-full h-32 object-cover rounded-lg mb-2"
        />
      )}

      <div className="flex justify-between items-start">
        <h3 className="font-semibold text-white text-lg">{title}</h3>
        <span className="bg-pink-500/10 text-pink-400 px-2 py-1 rounded text-sm font-bold">
          {price}
        </span>
      </div>

      <div className="text-zinc-400 text-sm flex items-center gap-2">
        <span>⏱ {duration}</span>
        {/* Mostrando se é Online ou Presencial se quiser */}
        {type && <span className="text-xs border border-zinc-700 px-2 py-0.5 rounded">{type}</span>}
      </div>

      <button 
        onClick={handleAgendar}
        className="mt-2 w-full bg-pink-600 hover:bg-pink-500 text-white font-medium py-2 rounded-lg transition-all active:scale-95"
      >
        Agendar Agora
      </button>
    </div>
  );
}