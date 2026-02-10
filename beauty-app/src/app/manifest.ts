import { MetadataRoute } from 'next';

// Removemos o 'export const dynamic' e o 'prisma' pois agora será estático e seguro
export default function manifest(): MetadataRoute.Manifest {
  
  // --- ADAPTAÇÃO NECESSÁRIA ---
  // Como deletamos a tabela 'configuracao', definimos valores padrão aqui.
  // Isso impede que o site quebre ao tentar ler uma tabela que não existe mais.
  const nomeLoja = "Agendamento App";
  const logoUrl = "/logo.png"; // Certifique-se de ter essa imagem em public/

  return {
    name: nomeLoja,
    short_name: "Agendamento",
    description: `Agendamentos para ${nomeLoja}`,
    start_url: '/', // Mudamos para a raiz (o admin exige login depois)
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