"use client"

import { BookingModal } from "./booking-modal"
import { Button } from "./ui/button"

interface ServiceItemProps {
    service: {
        id: string
        title: string
        price: number | string
        duration: number | string
        description?: string | null
    }
    establishmentId: string // <--- Recebemos o ID da barbearia aqui
}

export function ServiceItem({ service, establishmentId }: ServiceItemProps) {
    console.log("📍 SERVICE ITEM recebeu ID:", establishmentId);
    return (
        <div className="bg-zinc-900 p-4 rounded-lg border border-zinc-800 flex justify-between items-center group hover:border-zinc-700 transition-all">
            <div className="space-y-1">
                <span className="font-bold text-zinc-100 block">{service.title}</span>
                <span className="text-xs text-zinc-400 block">{service.duration} min • {service.description || "Serviço especializado"}</span>
                <span className="font-bold text-emerald-500 block mt-1">
                    R$ {Number(service.price).toFixed(2)}
                </span>
            </div>

            {/* Aqui passamos o ID para o seu Modal que acabamos de editar */}
            <BookingModal 
                serviceName={service.title} 
                price={service.price.toString()}
                establishmentId={establishmentId} 
            >
                <Button variant="outline" className="border-zinc-700 hover:bg-zinc-800 hover:text-white">
                    Reservar
                </Button>
            </BookingModal>
        </div>
    )
}