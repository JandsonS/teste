"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Lock, Loader2, ShieldCheck } from "lucide-react";
import { motion } from "framer-motion";

export default function AdminLogin() {
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        toast.success("Acesso permitido", {
            icon: <ShieldCheck className="text-emerald-500" />,
            className: "bg-zinc-950 border-zinc-800 text-white"
        });
        router.push("/admin");
      } else {
        toast.error("Senha incorreta", {
            className: "bg-zinc-950 border-red-900/50 text-red-400"
        });
      }
    } catch (error) {
      toast.error("Erro de conexão");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a] overflow-hidden relative px-4">
      
      {/* BACKGROUND SUTIL (LUZES NEUTRAS) */}
      <div className="fixed inset-0 z-0 pointer-events-none">
          <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-white/5 rounded-full blur-[150px] opacity-40" />
          <div className="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] bg-zinc-800/10 rounded-full blur-[150px] opacity-40" />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, type: "spring" }}
        className="bg-black/40 backdrop-blur-xl p-8 rounded-3xl border border-white/5 shadow-2xl w-full max-w-md relative z-10"
      >
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-white/5 rounded-2xl border border-white/10 flex items-center justify-center mx-auto mb-4 shadow-lg">
            <Lock className="text-white" size={28} />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Painel Administrativo</h1>
          <p className="text-zinc-500 text-sm mt-2">Área restrita para gerenciamento.</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div className="space-y-2">
            <Input
              type="password"
              placeholder="Digite a senha de acesso"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="bg-zinc-900/50 border-white/10 text-white focus:border-white focus:ring-0 h-12 rounded-xl text-center tracking-widest placeholder:text-zinc-600 placeholder:tracking-normal transition-all"
              required
            />
          </div>
          
          <Button
            type="submit"
            disabled={loading || !password}
            className="w-full bg-white text-black hover:bg-zinc-200 font-bold py-3 rounded-xl transition-all shadow-lg shadow-white/10 h-12 text-base"
          >
            {loading ? <Loader2 className="animate-spin" /> : "Entrar no Painel"}
          </Button>
        </form>

        <div className="mt-8 text-center">
            <p className="text-xs text-zinc-600 uppercase tracking-wider font-medium flex items-center justify-center gap-2">
                <ShieldCheck size={12} /> Ambiente Seguro
            </p>
        </div>
      </motion.div>
    </div>
  );
}