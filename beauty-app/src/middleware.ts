// middleware.ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  // Verifica se a variável de ambiente está ligada
  const isMaintenanceMode = process.env.MAINTENANCE_MODE === 'true';

  // Se estiver em manutenção e o usuário não estiver tentando acessar a api ou arquivos estáticos
  if (isMaintenanceMode && 
      !request.nextUrl.pathname.startsWith('/maintenance') &&
      !request.nextUrl.pathname.startsWith('/_next') &&
      !request.nextUrl.pathname.startsWith('/api') // Opcional: deixar API funcionando pro Admin
     ) {
    // Redireciona para uma página de aviso
    return NextResponse.rewrite(new URL('/maintenance', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: '/((?!api|_next/static|_next/image|favicon.ico).*)',
}