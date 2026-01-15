"use client";

import { useState, useEffect } from "react";
import { format, isSameDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { DayPicker } from "react-day-picker";
import "react-day-picker/dist/style.css";
import { SITE_CONFIG } from "@/constants/info";

interface ServiceProps {
  title: string;
  price: string;
  duration: string;
  imageUrl?: string;
  type?: string;
}

const HORARIOS_PADRAO = SITE_CONFIG.horarios;
const DIAS_BLOQUEADOS = SITE_CONFIG.diasBloqueados; 

export function ServiceCard({ title, price, duration, imageUrl, type }: ServiceProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [time, setTime] = useState("");
  const [clientName, setClientName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  
  const [horariosDisponiveis, setHorariosDisponiveis] = useState(HORARIOS_PADRAO);
  const whatsappNumber = SITE_CONFIG.whatsappNumber; 

  useEffect(() => {
    if (!selectedDate) {
      setHorariosDisponiveis(HORARIOS_PADRAO);
      return;
    }
    const hoje = new Date();
    if (isSameDay(selectedDate, hoje)) {
      const horaAtual = hoje.getHours();
      const horariosFiltrados = HORARIOS_PADRAO.filter((horario) => {
        const [horaString] = horario.split(":");
        return parseInt(horaString) > horaAtual;
      });
      setHorariosDisponiveis(horariosFiltrados);
    } else {
      setHorariosDisponiveis(HORARIOS_PADRAO);
    }
  }, [selectedDate]);

  const isDayDisabled = (date: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date < today || DIAS_BLOQUEADOS.includes(date.getDay());
  };

  const handlePagarNoLocal = () => {
    if (!selectedDate || !time || !clientName) {
      alert("Preencha todos os dados: Nome, Data e Horário.");
      return;
    }
    const dataFormatada = format(selectedDate, "dd/MM/yyyy", { locale: ptBR });
    const message = `*NOVA SOLICITAÇÃO (Pagar no Local)* 🗓️\n\n👤 *Cliente:* ${clientName}\n✂️ *Serviço:* ${title}\n📅 *Data:* ${dataFormatada}\n⏰ *Horário:* ${time}\n\n*Aguardo confirmação!*`;
    const link = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;
    window.open(link, "_blank");
    setIsModalOpen(false);
  };

  const handlePagarOnline = async () => {
    // 1. Validação Básica
    if (!selectedDate || !time || !clientName) {
      alert("Por favor, preencha seu Nome, Data e Horário.");
      return;
    }
    
    setIsLoading(true);

    const dataFormatada = format(selectedDate, "dd/MM/yyyy", { locale: ptBR });
    const numericPrice = parseFloat(price.replace("R$", "").replace(".", "").replace(",", ".").trim());

    try {
      console.log("Enviando solicitação para API...");
      
      const response = await fetch('/api/payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          title: title, 
          price: numericPrice,
          date: dataFormatada,
          time: time,
          clientName: clientName
        }),
      });

      const data = await response.json();

      // 2. AQUI ESTÁ A BARREIRA FINAL 🚧
      // Se a resposta NÃO for OK (ex: 409 Conflito), paramos tudo.
      if (!response.ok) {
        console.error("Erro retornado pela API:", data);
        alert(data.error || "Ocorreu um erro ao processar."); // Mostra o alerta "Horário Ocupado"
        setIsLoading(false); // Destrava o botão
        return; // IMPORTANTE: Encerra a função aqui. Não deixa descer para o redirect.
      }

      // 3. Sucesso: Vai para o pagamento
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert("Erro ao conectar com Mercado Pago.");
        setIsLoading(false);
      }

    } catch (error) {
      console.error("Erro de rede:", error);
      alert("Erro de conexão. Verifique sua internet.");
      setIsLoading(false);
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
          <div className="bg-zinc-900 border border-zinc-700 w-full max-w-md rounded-2xl shadow-2xl relative my-auto animate-in fade-in zoom-in duration-200 flex flex-col max-h-[90vh]">
            <div className="p-6 pb-2 border-b border-zinc-800">
                <button onClick={() => setIsModalOpen(false)} className="absolute top-4 right-4 text-zinc-500 hover:text-white text-xl">✕</button>
                <h3 className="text-xl font-bold text-white mb-1">{title}</h3>
                <p className="text-zinc-400 text-sm">Preencha os dados abaixo.</p>
            </div>
            <div className="p-6 overflow-y-auto space-y-6 custom-scrollbar">
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">Seu Nome</label>
                <input 
                  type="text" 
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-lg p-3 text-white focus:border-pink-500 outline-none" 
                  value={clientName} 
                  onChange={(e) => setClientName(e.target.value)} 
                  placeholder="Ex: Maria Silva" 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">Data</label>
                <div className="mb-3 p-2 bg-zinc-800 rounded border border-zinc-700 text-center text-pink-300 font-medium">
                    {selectedDate ? format(selectedDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR }) : "Selecione a data"}
                </div>
                <div className="flex justify-center bg-zinc-950 rounded-xl border border-zinc-800 p-2">
                    <DayPicker
                        mode="single" selected={selectedDate} onSelect={(date) => { setSelectedDate(date); setTime(""); }}
                        locale={ptBR} disabled={isDayDisabled}
                        modifiersClassNames={{ selected: "bg-pink-600 text-white font-bold rounded-full", today: "text-pink-400 font-bold", disabled: "text-zinc-700 opacity-50 cursor-not-allowed" }}
                        styles={{ caption: { color: "white" }, head_cell: { color: "#a1a1aa" }, cell: { color: "white" }, nav_button: { color: "white" } }}
                    />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">Horário</label>
                {!selectedDate ? <p className="text-sm text-zinc-500 italic">Selecione uma data.</p> : 
                 horariosDisponiveis.length === 0 ? <p className="text-sm text-red-400">Sem horários hoje.</p> : (
                  <div className="grid grid-cols-4 gap-2">
                    {horariosDisponiveis.map((horario) => (
                      <button key={horario} onClick={() => setTime(horario)}
                        className={`py-2 rounded-lg text-sm font-medium transition-all ${time === horario ? 'bg-pink-600 text-white scale-105' : 'bg-zinc-800 text-zinc-400 border border-zinc-700 hover:border-zinc-500 hover:text-white'}`}
                      >{horario}</button>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="p-6 pt-4 border-t border-zinc-800 bg-zinc-900/95">
              <div className="grid grid-cols-2 gap-3">
                <button onClick={handlePagarNoLocal} disabled={isLoading} className="w-full py-3 rounded-xl border border-zinc-600 text-zinc-300 hover:bg-zinc-800 font-medium text-sm">Pagar no Local</button>
                <button 
                  onClick={handlePagarOnline} 
                  disabled={!selectedDate || !time || !clientName || isLoading}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-pink-600 to-rose-600 text-white font-bold hover:shadow-lg hover:shadow-pink-500/20 disabled:opacity-50 text-sm flex justify-center items-center"
                >
                  {isLoading ? "Processando..." : "Pagar Online"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      <style jsx global>{` .rdp { --rdp-cell-size: 40px; margin: 0; } .rdp-button:hover:not([disabled]):not(.rdp-day_selected) { background-color: #27272a; border-radius: 50%; } `}</style>
    </>
  );
}