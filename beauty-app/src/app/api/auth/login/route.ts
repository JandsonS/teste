import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { password } = await request.json();

    // Verifica se a senha bate com a do .env
    if (password === process.env.ADMIN_PASSWORD) {
      
      const response = NextResponse.json({ success: true });

      // Cria o Cookie (O Crachá)
      // httpOnly: true impede que JavaScript malicioso leia o cookie
      response.cookies.set("admin_session", "true", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
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