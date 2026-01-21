import { NextResponse } from "next/server";
import { cookies } from "next/headers";
// Importamos a senha do arquivo privado
import { ADMIN_CONFIG } from "@/constants/private-config";

export async function POST(request: Request) {
  const body = await request.json();

  // Verifica se a senha digitada bate com a do arquivo de config
  if (body.password === ADMIN_CONFIG.password) {
    
    const cookieStore = await cookies();

    // Cria o crachá de acesso
    cookieStore.set("admin_token", "authenticated", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        maxAge: 60 * 60 * 24, // 1 dia
        path: "/",
    });

    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ success: false }, { status: 401 });
}