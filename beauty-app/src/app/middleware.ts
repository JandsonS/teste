import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  // 1. Verifica se a rota acessada começa com /admin
  if (request.nextUrl.pathname.startsWith('/admin')) {
    
    // 2. Se for a própria página de login, deixa passar (senão vira loop infinito)
    if (request.nextUrl.pathname === '/admin/login') {
      return NextResponse.next();
    }

    // 3. Verifica se existe o "crachá" (cookie de sessão)
    const session = request.cookies.get('admin_session');

    // 4. Se não tiver cookie, chuta para o login
    if (!session) {
      return NextResponse.redirect(new URL('/admin/login', request.url));
    }
  }

  return NextResponse.next();
}

// Configura quais rotas o segurança vai vigiar
export const config = {
  matcher: '/admin/:path*',
}