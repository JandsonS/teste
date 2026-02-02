import { MetadataRoute } from 'next';
import { prisma } from '@/lib/prisma'; // Verifique se o caminho do prisma está certo

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  // Valores padrão
  let name = "Agendamento App";
  let shortName = "Agendamento";
  let iconUrl = "/logo.png"; 

  try {
      const settings = await prisma.configuracao.findUnique({ where: { id: "settings" } });
      if (settings) {
          name = settings.nomeEstabelecimento || name;
          shortName = name.slice(0, 12);
          if (settings.logoUrl) iconUrl = settings.logoUrl;
      }
  } catch(e) {}

  return {
    name: name,
    short_name: shortName,
    description: 'Agende seu horário',
    start_url: '/',
    display: 'standalone',
    background_color: '#000000',
    theme_color: '#000000',
    icons: [
      {
        src: iconUrl,
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: iconUrl,
        sizes: '512x512',
        type: 'image/png',
      },
    ],
  };
}