import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ADMIN_CONFIG } from "@/constants/private-config";

export async function POST(request: Request) {
  const body = await request.json();

  if (body.password === ADMIN_CONFIG.password) {
    
    // 👇 O ERRO DO SEU PRINT É A FALTA DESSE 'await' AQUI 👇
    const cookieStore = await cookies(); 

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