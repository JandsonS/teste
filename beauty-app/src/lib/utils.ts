import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Função para deixar o número bonito visualmente
export const formatPhoneDisplay = (phone: string) => {
  if (!phone) return "";
  
  // 1. Remove tudo que não é número
  let clean = phone.replace(/\D/g, '');

  // 2. Se o número começar com 55 (Brasil) e for longo, remove o 55 para formatar o DDD
  if (clean.startsWith('55') && clean.length > 11) {
    clean = clean.slice(2);
  }

  // 3. Aplica a máscara (XX) XXXXX-XXXX
  return clean.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
};