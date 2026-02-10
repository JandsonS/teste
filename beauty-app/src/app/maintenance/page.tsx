import { Hammer, Construction, Clock } from "lucide-react";

export default function MaintenancePage() {
  return (
    <div className="min-h-screen bg-[#09090b] flex flex-col items-center justify-center p-6 text-center relative overflow-hidden">
      
      {/* Efeitos de Fundo (Luzes) */}
      <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-yellow-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] bg-orange-500/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="relative z-10 max-w-md w-full bg-zinc-900/50 border border-white/10 backdrop-blur-xl p-8 rounded-3xl shadow-2xl">
        
        {/* Ícone Animado */}
        <div className="mx-auto w-20 h-20 bg-zinc-800 rounded-2xl flex items-center justify-center mb-6 shadow-inner border border-white/5 group">
          <Construction size={40} className="text-yellow-500 animate-pulse" />
        </div>

        <h1 className="text-3xl font-black text-white mb-3 tracking-tight">
          Em Manutenção
        </h1>
        
        <p className="text-zinc-400 text-sm leading-relaxed mb-8">
          Estamos realizando melhorias no sistema para oferecer uma experiência ainda melhor. <br/>
          <span className="text-yellow-500/80 font-bold block mt-2">Voltaremos em breve!</span>
        </p>

        {/* Rodapé do Card */}
        <div className="flex items-center justify-center gap-2 text-xs font-bold text-zinc-600 bg-black/20 py-3 rounded-xl border border-white/5">
          <Clock size={14} />
          <span>Previsão de retorno: Em breve</span>
        </div>

      </div>

      <p className="absolute bottom-8 text-zinc-700 text-xs font-bold tracking-widest uppercase">
        Sistema em Atualização
      </p>
    </div>
  );
}