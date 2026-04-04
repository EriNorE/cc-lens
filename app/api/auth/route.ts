// app/api/auth/route.ts
import { NextResponse } from "next/server";
import { verifyToken, generateSessionCookie, COOKIE_NAME } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const token = (body as { token?: string }).token;

    if (!token || !verifyToken(token)) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    const response = NextResponse.json({ ok: true });
    response.cookies.set(COOKIE_NAME, generateSessionCookie(), {
      httpOnly: true,
      sameSite: "strict",
      secure: process.env.NODE_ENV === "production",
      path: "/",
    });
    return response;
  } catch {
    return NextResponse.json({ error: "Auth unavailable" }, { status: 503 });
  }
}
