import { SITE_CONFIG } from "@/constants/info";

export function Footer() {
  const anoAtual = new Date().getFullYear();

  return (
    <footer className="border-t border-white/10 bg-zinc-900/50 pt-12 pb-8 mt-20">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
          
          {/* Coluna 1: Sobre */}
          <div>
            <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <span className="text-pink-500">✦</span> {SITE_CONFIG.name}
            </h3>
            <p className="text-zinc-400 text-sm leading-relaxed max-w-sm">
              {SITE_CONFIG.description}
            </p>
          </div>

          {/* Coluna 2: Contato Rápido */}
          <div className="md:text-right">
            <h4 className="text-white font-semibold mb-4">Fale Conosco</h4>
            <a 
              href={`https://wa.me/${SITE_CONFIG.whatsappNumber}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 text-zinc-300 hover:text-pink-500 transition-colors"
            >
              <span>WhatsApp:</span>
              <span className="font-mono text-lg">
                 {/* Formatação simples do número apenas visual */}
                 {SITE_CONFIG.whatsappNumber.replace("55", "")}
              </span>
            </a>
            <p className="text-zinc-500 text-xs mt-2">
              Atendimento nos horários agendados.
            </p>
          </div>
        </div>

        {/* Linha Divisória */}
        <div className="border-t border-white/5 pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-zinc-600">
          <p>
            © {anoAtual} {SITE_CONFIG.name}. Todos os direitos reservados.
          </p>
          <div className="flex gap-4">
            <span className="hover:text-zinc-400 cursor-pointer">Termos de Uso</span>
            <span className="hover:text-zinc-400 cursor-pointer">Privacidade</span>
          </div>
        </div>
      </div>
    </footer>
  );
}