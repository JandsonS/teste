"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Lock, Loader2, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { SITE_CONFIG } from "@/constants/info";

export default function LoginPage() {
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      if (res.ok) {
        toast.success("Bem-vindo de volta!");
        
        // CORREÇÃO AQUI 👇
        // Em vez de router.push, usamos isso para forçar o navegador a recarregar com o cookie
        window.location.href = "/admin"; 
        
      } else {
        toast.error("Senha incorreta.");
        setPassword("");
        setLoading(false); // Só destrava se der erro
      }
    } catch (error) {
      toast.error("Erro ao conectar.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-3xl p-8 shadow-2xl">
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mb-4 border border-emerald-500/20">
            <Lock className="text-emerald-500" size={32} />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Acesso Restrito</h1>
          <p className="text-zinc-500 text-sm mt-2">Área administrativa da {SITE_CONFIG.name}</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-2">
            <input
              type="password"
              placeholder="Digite a senha"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full h-12 px-4 bg-zinc-950 border border-zinc-800 rounded-xl text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all outline-none placeholder:text-zinc-600 text-center tracking-widest"
              autoFocus
            />
          </div>

          <button
            type="submit"
            disabled={loading || !password}
            className="w-full h-12 bg-white text-black font-bold rounded-xl hover:bg-zinc-200 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? <Loader2 className="animate-spin" /> : <>Entrar <ArrowRight size={18} /></>}
          </button>
        </form>
        
        <div className="mt-8 text-center">
            <p className="text-xs text-zinc-600">Sistema seguro com criptografia SSL.</p>
        </div>
      </div>
    </div>
  );
}