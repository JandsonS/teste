"use client";

import { useState } from "react";

interface ServiceProps {
  title: string;
  price: string;
  duration: string;
  imageUrl?: string;
  type?: string;
}

export function ServiceCard({ title, price, duration, imageUrl, type }: ServiceProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [clientName, setClientName] = useState("");

  // CRIA IDs ÚNICOS PARA CADA CARD (Isso resolve o erro!)
  // Removemos espaços do título para usar como ID (ex: "Corte-date")
  const uniqueId = title.replace(/\s+/g, '-').toLowerCase();

  const whatsappNumber = "5587999999999"; 

  const handlePagarNoLocal = () => {
    if (!date || !time || !clientName) {
      alert("Por favor, preencha nome, data e horário.");
      return;
    }
    
    const message = `Olá! Gostaria de agendar:
✂️ *Serviço:* ${title}
📅 *Data:* ${date.split('-').reverse().join('/')}
⏰ *Horário:* ${time}
👤 *Cliente:* ${clientName}
💰 *Pagamento:* No Local (${price})`;

    const link = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;
    window.open(link, "_blank");
    setIsModalOpen(false);
  };

  const handlePagarOnline = async () => {
    if (!date || !time || !clientName) {
      alert("Por favor, preencha nome, data e horário.");
      return;
    }

    const agendamentoData = {
      service: title,
      date: date.split('-').reverse().join('/'),
      time: time,
      client: clientName
    };
    localStorage.setItem("agendamentoTemp", JSON.stringify(agendamentoData));

    const numericPrice = parseFloat(price.replace("R$", "").replace(",", ".").trim());
    try {
      const response = await fetch('/api/payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title, price: numericPrice }),
      });
      const data = await response.json();
      if (data.url) window.location.href = data.url;
    } catch (error) {
      alert("Erro ao iniciar pagamento.");
    }
  };

  return (
    <>
      <div className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-1 backdrop-blur-lg transition-all hover:border-pink-500/50 hover:shadow-2xl hover:shadow-pink-500/10">
        <div className="absolute inset-0 -z-10 bg-gradient-to-br from-pink-500/0 via-pink-500/0 to-pink-500/0 transition-all group-hover:from-pink-500/10 group-hover:via-pink-500/5 group-hover:to-pink-500/0 opacity-0 group-hover:opacity-100 duration-500" />
        
        <div className="rounded-xl bg-zinc-900/80 p-4 h-full flex flex-col justify-between">
          <div>
            {imageUrl && (
              <div className="overflow-hidden rounded-lg mb-4">
                <img src={imageUrl} alt={title} className="w-full h-40 object-cover transform transition-transform duration-500 group-hover:scale-110" />
              </div>
            )}
            <div className="flex justify-between items-start mb-2">
              <h3 className="font-bold text-xl text-white">{title}</h3>
              {type && <span className="text-[10px] uppercase tracking-wider border border-pink-500/30 text-pink-300 px-2 py-1 rounded-full">{type}</span>}
            </div>
            <div className="flex items-center justify-between mt-4">
              <div className="text-zinc-400 text-sm flex items-center gap-1 bg-zinc-800/50 px-3 py-1.5 rounded-lg">
                <span>⏱ {duration}</span>
              </div>
              <span className="text-2xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-pink-200 to-pink-500">{price}</span>
            </div>
          </div>

          <button 
            onClick={() => setIsModalOpen(true)}
            className="mt-6 w-full relative overflow-hidden rounded-xl bg-gradient-to-r from-pink-600 to-rose-600 px-4 py-3 text-sm font-bold text-white shadow-lg transition-transform active:scale-[0.98] hover:shadow-pink-500/25"
          >
            Agendar Horário
          </button>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-700 w-full max-w-md p-6 rounded-2xl shadow-2xl relative animate-in fade-in zoom-in duration-200">
            
            <button onClick={() => setIsModalOpen(false)} className="absolute top-4 right-4 text-zinc-500 hover:text-white">✕</button>
            
            <h3 className="text-xl font-bold text-white mb-1">Agendar: {title}</h3>
            <p className="text-zinc-400 text-sm mb-6">Preencha seus dados para prosseguir.</p>

            <div className="space-y-4">
              {/* CORREÇÃO AQUI: Adicionamos htmlFor e id correspondentes */}
              <div>
                <label htmlFor={`name-${uniqueId}`} className="block text-sm text-zinc-400 mb-1">Seu Nome</label>
                <input 
                  id={`name-${uniqueId}`}
                  type="text" 
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg p-3 text-white focus:border-pink-500 outline-none" 
                  value={clientName} 
                  onChange={(e) => setClientName(e.target.value)} 
                  placeholder="Ex: Maria Silva" 
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor={`date-${uniqueId}`} className="block text-sm text-zinc-400 mb-1">Data</label>
                  <input 
                    id={`date-${uniqueId}`}
                    type="date" 
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg p-3 text-white focus:border-pink-500 outline-none" 
                    value={date} 
                    onChange={(e) => setDate(e.target.value)} 
                  />
                </div>
                <div>
                  <label htmlFor={`time-${uniqueId}`} className="block text-sm text-zinc-400 mb-1">Horário</label>
                  <input 
                    id={`time-${uniqueId}`}
                    type="time" 
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg p-3 text-white focus:border-pink-500 outline-none" 
                    value={time} 
                    onChange={(e) => setTime(e.target.value)} 
                  />
                </div>
              </div>
            </div>

            <div className="mt-8">
              <p className="text-center text-zinc-500 text-xs mb-3">
                Antecipe seu pagamento aqui ou se preferir pague no local.
              </p>
              <div className="grid grid-cols-2 gap-3">
                <button onClick={handlePagarNoLocal} className="w-full py-3 rounded-xl border border-zinc-600 text-zinc-300 hover:bg-zinc-800 font-medium transition-colors">
                  Pagar no Local
                </button>
                <button onClick={handlePagarOnline} className="w-full py-3 rounded-xl bg-gradient-to-r from-pink-600 to-rose-600 text-white font-bold hover:shadow-lg hover:shadow-pink-500/20 transition-all">
                  Pagar Online
                </button>
              </div>
            </div>

          </div>
        </div>
      )}
    </>
  );
}