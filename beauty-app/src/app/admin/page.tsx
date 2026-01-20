"use client"

import { useEffect, useState, useMemo } from "react"
import { AdminBookingCard } from "@/components/AdminBookingCard"
import { Loader2, RefreshCw, DollarSign, Users, Clock, CalendarDays, Filter, Lock, LogOut } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { SITE_CONFIG } from "@/constants/info" // Importando a senha

interface Booking {
  id: string
  cliente: string
  servico: string
  data: string
  horario: string
  status: string
  valor: number
  metodoPagamento?: string
  telefone?: string 
}

export default function AdminPage() {
  // --- ESTADOS DE AUTENTICAÇÃO ---
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [passwordInput, setPasswordInput] = useState("")
  const [authLoading, setAuthLoading] = useState(true) // Começa carregando para verificar cookie

  // --- ESTADOS DO DASHBOARD ---
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'hoje' | 'amanha' | 'todos'>('hoje')

  // 1. VERIFICA SE JÁ ESTÁ LOGADO (COOKIE) AO ABRIR
  useEffect(() => {
    const checkAuth = () => {
        // Procura por um cookie chamado "admin_session"
        const session = document.cookie.split('; ').find(row => row.startsWith('admin_session='));
        if (session) {
            setIsAuthenticated(true);
        }
        setAuthLoading(false);
    }
    checkAuth();
  }, []);

  // 2. FUNÇÃO DE LOGIN
  const handleLogin = (e?: React.FormEvent) => {
    e?.preventDefault();
    
    if (passwordInput === SITE_CONFIG.adminPassword) {
        // Cria um cookie que expira em 12 horas (0.5 dias)
        const date = new Date();
        date.setTime(date.getTime() + (12 * 60 * 60 * 1000));
        document.cookie = `admin_session=true; expires=${date.toUTCString()}; path=/`;
        
        setIsAuthenticated(true);
        toast.success("Bem-vindo(a) de volta!");
        fetchBookings(); // Já carrega os dados
    } else {
        toast.error("Senha incorreta");
        setPasswordInput(""); // Limpa o campo
    }
  }

  // 3. FUNÇÃO DE LOGOUT
  const handleLogout = () => {
    document.cookie = "admin_session=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    setIsAuthenticated(false);
    setPasswordInput("");
  }

  // FUNÇÃO DE BUSCA DE DADOS
  const fetchBookings = async (isAuto = false) => {
    if (!isAuto) setLoading(true)
    try {
      const res = await fetch("/api/admin") 
      if (!res.ok) throw new Error("Falha ao buscar")
      const data = await res.json()
      setBookings(data)
    } catch (error) {
      if (!isAuto) toast.error("Erro ao carregar agendamentos")
    } finally {
      if (!isAuto) setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if(!confirm("Tem certeza que deseja cancelar este agendamento?")) return;
    try {
      const res = await fetch(`/api/admin?id=${id}`, { method: 'DELETE' })
      if (res.ok) {
        toast.success("Agendamento cancelado")
        fetchBookings(true) 
      }
    } catch (error) {
      toast.error("Erro ao cancelar")
    }
  }

  // ATUALIZAÇÃO AUTOMÁTICA (POLLING) - Só roda se estiver logado
  useEffect(() => {
    if (!isAuthenticated) return;
    
    fetchBookings();
    const interval = setInterval(() => { fetchBookings(true) }, 30000); 
    return () => clearInterval(interval);
  }, [isAuthenticated])

  // CÁLCULOS (Métricas e Filtros) - Igual ao anterior
  const stats = useMemo(() => {
    const hoje = new Date().toLocaleDateString('pt-BR');
    const agendamentosHoje = bookings.filter(b => b.data === hoje);
    const faturamento = agendamentosHoje.reduce((acc, curr) => {
      if (curr.status.includes('PAGO') || curr.status.includes('SINAL') || curr.status === 'CONFIRMADO') {
        return acc + Number(curr.valor);
      }
      return acc;
    }, 0);
    return {
      faturamento,
      clientesHoje: agendamentosHoje.length,
      pendentes: bookings.filter(b => b.status === 'PENDENTE').length
    };
  }, [bookings]);

  const filteredList = useMemo(() => {
    const hoje = new Date();
    const amanha = new Date(hoje);
    amanha.setDate(amanha.getDate() + 1);
    const hojeStr = hoje.toLocaleDateString('pt-BR');
    const amanhaStr = amanha.toLocaleDateString('pt-BR');

    if (filter === 'hoje') return bookings.filter(b => b.data === hojeStr);
    if (filter === 'amanha') return bookings.filter(b => b.data === amanhaStr);
    return bookings;
  }, [bookings, filter]);

  // --- RENDERIZAÇÃO ---

  // 1. Tela de Carregamento Inicial (Verificando Login)
  if (authLoading) {
    return (
        <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
            <Loader2 className="animate-spin text-pink-500 w-10 h-10" />
        </div>
    )
  }

  // 2. Tela de Login (Se não estiver logado)
  if (!isAuthenticated) {
    return (
        <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 p-8 rounded-2xl shadow-2xl">
                <div className="flex justify-center mb-6">
                    <div className="p-4 bg-zinc-800 rounded-full">
                        <Lock size={32} className="text-pink-500" />
                    </div>
                </div>
                <h1 className="text-2xl font-bold text-center text-white mb-2">Acesso Restrito</h1>
                <p className="text-zinc-400 text-center mb-6 text-sm">Digite a senha de administrador para acessar o painel.</p>
                
                <form onSubmit={handleLogin} className="space-y-4">
                    <Input 
                        type="password" 
                        placeholder="Senha de acesso" 
                        className="bg-zinc-950 border-zinc-700 text-white h-12"
                        value={passwordInput}
                        onChange={(e) => setPasswordInput(e.target.value)}
                    />
                    <Button type="submit" className="w-full h-12 bg-pink-600 hover:bg-pink-700 font-bold text-white">
                        Entrar no Painel
                    </Button>
                </form>
            </div>
        </div>
    )
  }

  // 3. O Dashboard (Se estiver logado)
  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8">
      <div className="max-w-5xl mx-auto">
        
        {/* CABEÇALHO */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-purple-500">
              Painel Administrativo
            </h1>
            <p className="text-zinc-400 text-sm flex items-center gap-2 mt-1">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              Sistema operando em tempo real
            </p>
          </div>
          
          <div className="flex gap-2 w-full md:w-auto">
            <button 
                onClick={() => fetchBookings(false)}
                className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 px-4 py-2 rounded-xl transition-all text-sm font-medium"
            >
                <RefreshCw size={16} className={loading ? "animate-spin text-pink-500" : "text-zinc-400"} />
                Atualizar
            </button>
            <button 
                onClick={handleLogout}
                className="flex items-center justify-center gap-2 bg-red-500/10 border border-red-500/20 text-red-500 hover:bg-red-500/20 px-4 py-2 rounded-xl transition-all text-sm font-medium"
                title="Sair do sistema"
            >
                <LogOut size={16} />
            </button>
          </div>
        </div>

        {/* HUD (MÉTRICAS) */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4 mb-8">
            <div className="bg-zinc-900/50 border border-zinc-800 p-4 rounded-2xl flex flex-col justify-between hover:border-emerald-500/30 transition-colors">
                <div className="flex justify-between items-start mb-2">
                    <span className="text-zinc-500 text-xs font-bold uppercase tracking-wider">Faturamento (Hoje)</span>
                    <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-500"><DollarSign size={16}/></div>
                </div>
                <p className="text-2xl md:text-3xl font-bold text-white">
                    {stats.faturamento.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </p>
            </div>

            <div className="bg-zinc-900/50 border border-zinc-800 p-4 rounded-2xl flex flex-col justify-between hover:border-blue-500/30 transition-colors">
                <div className="flex justify-between items-start mb-2">
                    <span className="text-zinc-500 text-xs font-bold uppercase tracking-wider">Agendados (Hoje)</span>
                    <div className="p-2 bg-blue-500/10 rounded-lg text-blue-500"><Users size={16}/></div>
                </div>
                <p className="text-2xl md:text-3xl font-bold text-white">{stats.clientesHoje}</p>
            </div>

            <div className="col-span-2 md:col-span-1 bg-zinc-900/50 border border-zinc-800 p-4 rounded-2xl flex flex-col justify-between hover:border-yellow-500/30 transition-colors">
                <div className="flex justify-between items-start mb-2">
                    <span className="text-zinc-500 text-xs font-bold uppercase tracking-wider">Pagando Agora</span>
                    <div className="p-2 bg-yellow-500/10 rounded-lg text-yellow-500"><Clock size={16}/></div>
                </div>
                <div className="flex items-baseline gap-2">
                    <p className="text-2xl md:text-3xl font-bold text-white">{stats.pendentes}</p>
                    {stats.pendentes > 0 && <span className="text-xs text-yellow-500 animate-pulse">● Cliente ativo</span>}
                </div>
            </div>
        </div>

        {/* ABAS DE FILTRO */}
        <div className="flex flex-col md:flex-row justify-between items-end md:items-center mb-4 gap-4">
            <div className="flex p-1 bg-zinc-900 rounded-xl border border-zinc-800 w-full md:w-auto">
                <button onClick={() => setFilter('hoje')} className={`flex-1 md:flex-none px-6 py-2 rounded-lg text-sm font-medium transition-all ${filter === 'hoje' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}>Hoje</button>
                <button onClick={() => setFilter('amanha')} className={`flex-1 md:flex-none px-6 py-2 rounded-lg text-sm font-medium transition-all ${filter === 'amanha' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}>Amanhã</button>
                <button onClick={() => setFilter('todos')} className={`flex-1 md:flex-none px-6 py-2 rounded-lg text-sm font-medium transition-all ${filter === 'todos' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}>Todos</button>
            </div>
            <span className="text-xs text-zinc-500 flex items-center gap-1"><Filter size={12}/> Visualizando {filteredList.length} agendamentos</span>
        </div>

        {/* LISTA DE AGENDAMENTOS */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4"><Loader2 className="animate-spin text-pink-500 w-10 h-10" /><p className="text-zinc-500 text-sm">Carregando agenda...</p></div>
        ) : filteredList.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 bg-zinc-900/30 rounded-2xl border border-zinc-800 border-dashed"><div className="p-4 bg-zinc-900 rounded-full mb-3 text-zinc-600"><CalendarDays size={32} /></div><p className="text-zinc-400 font-medium">Nenhum agendamento para este período.</p><p className="text-zinc-600 text-sm">Aguarde novos clientes.</p></div>
        ) : (
          <div className="space-y-3 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {filteredList.map((booking) => (
              <AdminBookingCard key={booking.id} booking={booking} onDelete={handleDelete} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}