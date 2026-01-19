"use client"

import { useState, useEffect } from "react"
import { RefreshCw } from "lucide-react"
import { toast } from "sonner"
import { AdminBookingCard } from "@/components/AdminBookingCard"

export default function AdminPage() {
  const [bookings, setBookings] = useState<any[]>([]); // Começa como lista vazia
  const [loading, setLoading] = useState(true);

  const fetchBookings = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin');
      const data = await res.json();
      
      // --- CORREÇÃO DE SEGURANÇA AQUI ---
      // Verificamos se 'data' é realmente uma lista (Array) antes de salvar
      if (Array.isArray(data)) {
        setBookings(data);
      } else {
        console.error("A API retornou algo que não é uma lista:", data);
        setBookings([]); // Se der erro, garante que fica vazio pra não quebrar a tela
      }
      
    } catch (error) {
      console.error("Erro ao buscar", error);
      setBookings([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja cancelar este agendamento?")) return;
    try {
      await fetch(`/api/admin?id=${id}`, { method: 'DELETE' });
      toast.success("Agendamento cancelado.");
      fetchBookings();
    } catch (error) {
      toast.error("Erro ao cancelar.");
    }
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-pink-500">Painel Administrativo</h1>
          <button 
            onClick={fetchBookings}
            className="flex items-center gap-2 px-4 py-2 bg-zinc-800 rounded-lg hover:bg-zinc-700 transition"
          >
            <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
            Atualizar
          </button>
        </div>

        <div className="space-y-4">
          {loading && <p className="text-zinc-500 text-center">Carregando...</p>}
          
          {/* Só mostra mensagem de vazio se não estiver carregando e a lista estiver vazia */}
          {!loading && bookings.length === 0 && (
            <div className="text-center py-10 border border-zinc-800 rounded-xl bg-zinc-900/50">
              <p className="text-zinc-400 mb-2">Nenhum agendamento encontrado.</p>
              <p className="text-xs text-zinc-600">Ou ocorreu um erro ao carregar os dados.</p>
            </div>
          )}

          {/* Aqui o .map() só roda se bookings for uma lista válida */}
          {Array.isArray(bookings) && bookings.map((booking) => (
            <AdminBookingCard 
              key={booking.id} 
              booking={booking} 
              onDelete={handleDelete} 
            />
          ))}
        </div>
      </div>
    </div>
  );
}