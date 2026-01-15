"use client";

import { useState, useEffect } from 'react';
import { SITE_CONFIG } from '@/constants/info';

interface Agendamento {
  id: string;
  cliente: string;
  servico: string;
  data: string;
  horario: string;
  valor: number;
  status: string;
}

export default function AdminPage() {
  const [senha, setSenha] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([]);
  const [loading, setLoading] = useState(false);

  // SENHA DE ACESSO (Pode mudar aqui)
  const SENHA_MESTRA = "admin123";

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (senha === SENHA_MESTRA) {
      setIsAuthenticated(true);
      fetchAgendamentos();
    } else {
      alert("Senha incorreta!");
    }
  };

  const fetchAgendamentos = async () => {
    setLoading(true);
    try {
      const req = await fetch('/api/admin');
      const data = await req.json();
      setAgendamentos(data);
    } catch (error) {
      alert("Erro ao carregar agenda.");
    } finally {
      setLoading(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <form onSubmit={handleLogin} className="bg-zinc-900 p-8 rounded-xl border border-zinc-800 w-full max-w-sm">
          <h1 className="text-2xl font-bold text-white mb-6 text-center">🔐 Área Restrita</h1>
          <input 
            type="password" 
            placeholder="Digite a senha de admin"
            className="w-full bg-zinc-950 border border-zinc-700 rounded-lg p-3 text-white mb-4"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
          />
          <button className="w-full bg-pink-600 hover:bg-pink-700 text-white font-bold py-3 rounded-lg transition">
            Entrar
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-pink-400 to-purple-600">
            Painel Administrativo
          </h1>
          <button onClick={fetchAgendamentos} className="text-sm bg-zinc-800 hover:bg-zinc-700 px-4 py-2 rounded-lg">
            🔄 Atualizar
          </button>
        </div>

        {loading ? (
          <p className="text-center text-zinc-500">Carregando agendamentos...</p>
        ) : (
          <div className="grid gap-4">
            {agendamentos.length === 0 ? (
              <p className="text-zinc-500">Nenhum agendamento encontrado.</p>
            ) : (
              agendamentos.map((item) => (
                <div key={item.id} className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl flex flex-col md:flex-row justify-between items-center gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-bold text-lg text-white">{item.cliente}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                        item.status === 'PENDENTE' ? 'bg-yellow-500/20 text-yellow-500' :
                        item.status === 'AGENDADO_LOCAL' ? 'bg-blue-500/20 text-blue-400' :
                        item.status === 'PAGO' ? 'bg-green-500/20 text-green-500' :
                        'bg-red-500/20 text-red-500'
                      }`}>
                        {item.status === 'AGENDADO_LOCAL' ? 'PAGAR NO LOCAL' : item.status}
                      </span>
                    </div>
                    <p className="text-zinc-400 text-sm">
                      ✂️ {item.servico} | 📅 {item.data} às {item.horario}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-xl text-pink-500">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.valor)}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}