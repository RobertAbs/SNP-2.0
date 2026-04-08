import { NextRequest, NextResponse } from "next/server";
import { validateCredentials, encodeSession, SESSION_COOKIE } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const { login, password } = await req.json();

    if (!login || !password) {
      return NextResponse.json({ error: "Введите логин и пароль" }, { status: 400 });
    }

    const user = validateCredentials(login, password);
    if (!user) {
      return NextResponse.json({ error: "Неверный логин или пароль" }, { status: 401 });
    }

    const token = encodeSession(user);
    const res = NextResponse.json({ ok: true, user });

    res.cookies.set(SESSION_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24,
    });

    return res;
  } catch (err) {
    console.error("login error:", err);
    return NextResponse.json({ error: "Ошибка сервера", detail: String(err) }, { status: 500 });
  }
}
