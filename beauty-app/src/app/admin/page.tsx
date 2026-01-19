"use client"

import { useEffect, useState } from "react"
import { AdminBookingCard } from "@/components/AdminBookingCard"
import { Loader2, RefreshCw } from "lucide-react"
import { toast } from "sonner"

interface Booking {
  id: string
  cliente: string
  servico: string
  data: string
  horario: string
  status: string
  valor: number
  metodoPagamento?: string
  telefone?: string // Agora o frontend sabe que existe telefone
}

export default function AdminPage() {
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)

  const fetchBookings = async () => {
    setLoading(true)
    try {
      // Chama o arquivo CORRETO da API
      const res = await fetch("/api/admin") 
      if (!res.ok) throw new Error("Falha ao buscar")
      const data = await res.json()
      setBookings(data)
    } catch (error) {
      toast.error("Erro ao carregar agendamentos")
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/admin?id=${id}`, { method: 'DELETE' })
      if (res.ok) {
        toast.success("Agendamento cancelado")
        fetchBookings() // Recarrega a lista
      }
    } catch (error) {
      toast.error("Erro ao cancelar")
    }
  }

  useEffect(() => {
    fetchBookings()
  }, [])

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-6 md:p-10">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-pink-500">Painel Administrativo</h1>
          <button 
            onClick={fetchBookings}
            className="flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 px-4 py-2 rounded-lg transition-colors text-sm font-medium"
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
            Atualizar
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="animate-spin text-pink-500 w-10 h-10" />
          </div>
        ) : bookings.length === 0 ? (
          <div className="text-center py-20 bg-zinc-900/50 rounded-2xl border border-zinc-800">
            <p className="text-zinc-500">Nenhum agendamento encontrado.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {bookings.map((booking) => (
              <AdminBookingCard 
                key={booking.id} 
                booking={booking} 
                onDelete={handleDelete} 
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}