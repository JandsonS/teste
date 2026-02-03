import { MetadataRoute } from 'next';
import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic'; 

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const settings = await prisma.configuracao.findUnique({
    where: { id: "settings" }
  });

  const nomeLoja = settings?.nomeEstabelecimento || "Agendamento";
  const logoUrl = settings?.logoUrl || "/icon-192x192.png";

  return {
    name: nomeLoja,
    short_name: nomeLoja,
    description: `Agendamentos para ${nomeLoja}`,
    start_url: '/',
    display: 'standalone',
    background_color: '#09090b',
    theme_color: '#09090b',
    icons: [
      {
        src: logoUrl,
        sizes: 'any',
        type: 'image/x-icon',
      },
    ],
  };
}