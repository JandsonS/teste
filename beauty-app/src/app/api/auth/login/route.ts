import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { password } = await request.json();

    if (password === process.env.ADMIN_PASSWORD) {
      
      const response = NextResponse.json({ success: true });

      // AQUI ESTÁ A CORREÇÃO 👇
      response.cookies.set("admin_session", "true", {
        httpOnly: true,
        // Força secure: true (Vercel é sempre HTTPS, então isso evita falhas)
        secure: true, 
        // Lax permite que o cookie navegue junto com o usuário
        sameSite: "lax", 
        maxAge: 60 * 60 * 24 * 7, // 7 dias
        path: "/",
      });

      return response;
    }

    return NextResponse.json({ error: "Senha incorreta" }, { status: 401 });
  } catch (error) {
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}