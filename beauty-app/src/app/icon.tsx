import { ImageResponse } from 'next/og';

// Configurações da imagem
export const size = {
  width: 32,
  height: 32,
};
export const contentType = 'image/png';

// Geração do ícone
export default function Icon() {
  return new ImageResponse(
    (
      // Elemento JSX simples (Um quadrado preto com a letra B de Barber)
      // Isso é super leve e não quebra o build
      <div
        style={{
          fontSize: 24,
          background: 'black',
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          borderRadius: '20%',
        }}
      >
        B
      </div>
    ),
    {
      ...size,
    }
  );
}