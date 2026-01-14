import { defineConfig } from '@prisma/config';
import dotenv from 'dotenv';

// Tenta ler o arquivo .env padrão
dotenv.config();
// FORÇA a leitura do arquivo .env.local (Onde estão suas chaves da Vercel)
dotenv.config({ path: '.env.local' });

export default defineConfig({
  datasource: {
    // Agora ele vai achar a URL com certeza
    url: process.env.DATABASE_URL,
  },
});