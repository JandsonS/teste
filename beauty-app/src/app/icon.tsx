import { ImageResponse } from 'next/og';
import { prisma } from '@/lib/prisma';
import { SITE_CONFIG } from '@/constants/info';

// Configurações do ícone
export const size = { width: 32, height: 32 };
export const contentType = 'image/png';

// Essa função roda toda vez que o navegador pede o ícone da aba
export default async function Icon() {
  // 1. Começa com a logo padrão
  let logoUrl = SITE_CONFIG.images.logo; 

  try {
    // 2. Tenta buscar a logo personalizada no banco de dados
    const settings = await prisma.configuracao.findUnique({
      where: { id: 'settings' },
      select: { logoUrl: true },
    });

    // 3. Se achou uma logo personalizada, usa ela
    if (settings?.logoUrl) {
      logoUrl = settings.logoUrl;
    }
  } catch (error) {
    console.error('Erro ao buscar favicon dinâmico:', error);
    // Se der erro, ele vai usar a logo padrão definida na linha 12
  }

  // 4. Gera a imagem do ícone em tempo real
  return new ImageResponse(
    (
      /* eslint-disable-next-line @next/next/no-img-element */
      <img
        src={logoUrl}
        alt="Favicon"
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'contain', // Garante que a logo não fique esticada
        }}
      />
    ),
    { ...size }
  );
}