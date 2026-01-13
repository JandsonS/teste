"use client";

import { useState } from "react";

interface ServiceProps {
  title: string;
  price: string;
  duration: string;
  imageUrl?: string;
  type?: string;
}

// --- REGRAS DE NEGÓCIO (CONFIGURE AQUI) ---
const HORARIOS_DISPONIVEIS = [
  "09:00", "10:00", "11:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00"
];

// Dias proibidos (0 = Domingo, 1 = Segunda, 2 = Terça... 6 = Sábado)
const DIAS_BLOQUEADOS = [0, 1]; // Ex: Domingo e Segunda fechados

export function ServiceCard({ title, price, duration, imageUrl, type }: ServiceProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [date, setDate] = useState("");
  const [time, setTime] = useState(""); // Agora time é selecionado por botão
  const [clientName, setClientName] = useState("");

  const uniqueId = title.replace(/\s+/g, '-').toLowerCase();
  const whatsappNumber = "5587991537080"; 

  // Pega a data de hoje no formato YYYY-MM-DD para bloquear o passado
  const hoje = new Date().toISOString().split("T")[0];

  // --- FUNÇÃO INTELIGENTE DE DATA ---
  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const dataSelecionada = e.target.value;
    const diaDaSemana = new Date(dataSelecionada).getUTCDay(); // Pega o dia (0-6)

    if (DIAS_BLOQUEADOS.includes(diaDaSemana)) {
      alert("Ops! Não funcionamos neste dia da semana. Por favor escolha outro.");
      setDate(""); // Limpa o campo
    } else {
      setDate(dataSelecionada);
    }
  };

  const handlePagarNoLocal = () => {
    if (!date || !time || !clientName) {
      alert("Preencha todos os dados: Nome, Data e Horário.");
      return;
    }
    
    const message = `*NOVA SOLICITAÇÃO* 🗓️
_________________________
👤 *Cliente:* ${clientName}
✂️ *Serviço:* ${title}
💵 *Valor:* ${price} (Pagar no Local)
📅 *Data:* ${date.split('-').reverse().join('/')}
⏰ *Horário:* ${time}
_________________________
*Aguardo confirmação!*`;

    const link = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;
    window.open(link, "_blank");
    setIsModalOpen(false);
  };

  const handlePagarOnline = async () => {
    if (!date || !time || !clientName) {
      alert("Preencha todos os dados: Nome, Data e Horário.");
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
      {/* CARD (Visual permanece igual) */}
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

      {/* --- MODAL COM AS NOVAS REGRAS --- */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
          <div className="bg-zinc-900 border border-zinc-700 w-full max-w-md p-6 rounded-2xl shadow-2xl relative my-auto animate-in fade-in zoom-in duration-200">
            
            <button onClick={() => setIsModalOpen(false)} className="absolute top-4 right-4 text-zinc-500 hover:text-white">✕</button>
            
            <h3 className="text-xl font-bold text-white mb-1">{title}</h3>
            <p className="text-zinc-400 text-sm mb-6">Escolha o melhor horário para você.</p>

            <div className="space-y-5">
              
              {/* NOME */}
              <div>
                <label htmlFor={`name-${uniqueId}`} className="block text-sm font-medium text-zinc-300 mb-2">Seu Nome Completo</label>
                <input 
                  id={`name-${uniqueId}`}
                  type="text" 
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-lg p-3 text-white focus:border-pink-500 outline-none transition-colors" 
                  value={clientName} 
                  onChange={(e) => setClientName(e.target.value)} 
                  placeholder="Ex: Maria Silva" 
                />
              </div>
              
              {/* DATA (Com Validação) */}
              <div>
                <label htmlFor={`date-${uniqueId}`} className="block text-sm font-medium text-zinc-300 mb-2">Data do Agendamento</label>
                <input 
                  id={`date-${uniqueId}`}
                  type="date" 
                  min={hoje} // REGRA 1: Bloqueia passado
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-lg p-3 text-white focus:border-pink-500 outline-none transition-colors" 
                  value={date} 
                  onChange={handleDateChange} // REGRA 2: Valida dias da semana
                />
                <p className="text-xs text-zinc-500 mt-1">Funcionamos de Terça a Sábado.</p>
              </div>

              {/* HORÁRIOS (Botões em Grade) */}
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">Horários Disponíveis</label>
                <div className="grid grid-cols-4 gap-2">
                  {HORARIOS_DISPONIVEIS.map((horario) => (
                    <button
                      key={horario}
                      onClick={() => setTime(horario)}
                      className={`py-2 rounded-lg text-sm font-medium transition-all
                        ${time === horario 
                          ? 'bg-pink-600 text-white shadow-lg shadow-pink-500/20 scale-105 border-transparent' 
                          : 'bg-zinc-800 text-zinc-400 border border-zinc-700 hover:border-zinc-500 hover:text-white'
                        }`}
                    >
                      {horario}
                    </button>
                  ))}
                </div>
                {!time && <p className="text-xs text-red-400 mt-2 animate-pulse">Selecione um horário acima</p>}
              </div>

            </div>

            {/* Ações */}
            <div className="mt-8 pt-6 border-t border-zinc-800">
              <div className="grid grid-cols-2 gap-3">
                <button 
                  onClick={handlePagarNoLocal} 
                  className="w-full py-3 rounded-xl border border-zinc-600 text-zinc-300 hover:bg-zinc-800 font-medium transition-colors text-sm"
                >
                  Pagar no Local
                </button>
                <button 
                  onClick={handlePagarOnline} 
                  disabled={!date || !time || !clientName}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-pink-600 to-rose-600 text-white font-bold hover:shadow-lg hover:shadow-pink-500/20 transition-all text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
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