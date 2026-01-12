"use client"

import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Clock, Video, MapPin, Sparkle } from "lucide-react"
// Importamos o nosso novo Modal
import { BookingModal } from "./booking-modal"

interface ServiceProps {
  title: string
  price: string
  duration: string
  type: 'presencial' | 'online'
  imageUrl: string
}

export function ServiceCard({ title, price, duration, type, imageUrl }: ServiceProps) {
  return (
    <Card className="group overflow-hidden bg-white border-gray-100 rounded-2xl shadow-md hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 flex flex-col h-full">
      <div className="h-60 relative overflow-hidden">
        <div className="absolute inset-0 bg-black/0 transition-colors group-hover:bg-black/10 z-10" />
        <img 
          src={imageUrl} 
          alt={title} 
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
        />
        {type === 'online' && (
          <Badge className="absolute top-4 right-4 bg-purple-100 text-purple-700 font-medium border-purple-200 z-20">
            <Video className="w-3.5 h-3.5 mr-1.5" /> Online
          </Badge>
        )}
         {type === 'presencial' && (
          <Badge className="absolute top-4 right-4 bg-rose-50 text-rose-700 font-medium border-rose-200 z-20">
            <MapPin className="w-3.5 h-3.5 mr-1.5" /> Studio
          </Badge>
        )}
      </div>

      <CardContent className="p-6 flex-1 flex flex-col justify-between">
        <div>
          <h3 className="font-bold text-xl text-gray-900 mb-3">{title}</h3>
          <div className="flex flex-wrap gap-2 text-sm mb-6">
            <div className="flex items-center text-gray-600 bg-gray-50 px-3 py-1.5 rounded-full border border-gray-100">
              <Clock className="w-4 h-4 mr-2 text-rose-500" /> 
              <span className="font-medium">{duration}</span>
            </div>
          </div>
        </div>
        
        <div>
           <p className="text-xs text-gray-500 mb-0.5 font-medium uppercase">Valor</p>
           <p className="text-3xl font-extrabold text-rose-600">{price}</p>
        </div>
      </CardContent>

      <CardFooter className="p-6 pt-0">
        {/* AQUI ESTÁ A MUDANÇA: O botão agora está dentro do BookingModal */}
        <BookingModal serviceName={title} price={price}>
            <Button 
              className="w-full bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-700 hover:to-rose-600 text-white font-bold h-14 text-lg rounded-xl shadow-md hover:shadow-lg transition-all"
            >
              <Sparkle className="w-5 h-5 mr-2" /> Agendar Horário
            </Button>
        </BookingModal>
      </CardFooter>
    </Card>
  )
}