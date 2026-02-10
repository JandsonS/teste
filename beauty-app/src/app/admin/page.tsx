"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Lock, ArrowRight, LayoutDashboard } from "lucide-react";

export default function AdminLoginPage() {
  const [slug, setSlug] = useState("");
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (slug) {
      setLoading(true);
      // Redireciona para a pasta [slug] onde está o painel real
      router.push(`/admin/${slug}`);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Efeitos de Fundo */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-emerald-500/10 rounded-full blur-[120px]" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-blue-500/10 rounded-full blur-[120px]" />

      <div className="w-full max-w-sm space-y-8 bg-zinc-900/80 p-8 rounded-3xl border border-white/10 backdrop-blur-xl shadow-2xl relative z-10">
        <div className="text-center">
          <div className="mx-auto h-16 w-16 bg-zinc-800 rounded-2xl flex items-center justify-center mb-6 text-white border border-white/5 shadow-inner">
            <LayoutDashboard size={32} className="text-emerald-500" />
          </div>
          <h2 className="text-3xl font-black text-white tracking-tight">Painel Admin</h2>
          <p className="mt-2 text-sm text-zinc-400">Gerencie seus agendamentos</p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleLogin}>
          <div className="space-y-2">
            <label htmlFor="slug" className="text-xs font-bold text-zinc-500 uppercase tracking-wider ml-1">
                Identificador da Loja
            </label>
            <div className="relative group">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-white transition-colors" size={18} />
                <Input
                id="slug"
                name="slug"
                type="text"
                required
                className="bg-zinc-950 border-zinc-800 text-white h-14 rounded-xl pl-12 placeholder:text-zinc-600 focus:border-emerald-500/50 transition-all"
                placeholder="Ex: barbearia-top"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                />
            </div>
          </div>

          <Button 
            type="submit" 
            disabled={loading}
            className="w-full h-14 bg-white text-black hover:bg-zinc-200 font-bold rounded-xl text-base shadow-lg hover:shadow-xl transition-all active:scale-95 flex items-center gap-2 justify-center"
          >
            {loading ? "Entrando..." : "Acessar Painel"} {!loading && <ArrowRight size={18} />}
          </Button>
        </form>
        
        <p className="text-center text-xs text-zinc-600 mt-4">
            Sistema de Gestão Multi-tenant
        </p>
      </div>
    </div>
  );
}