// app/api/auth/route.ts
import { NextResponse } from "next/server";
import { verifyToken, generateSessionCookie, COOKIE_NAME } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const token = (body as { token?: string }).token;

  if (!token || !verifyToken(token)) {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(COOKIE_NAME, generateSessionCookie(), {
    httpOnly: true,
    sameSite: "strict",
    path: "/",
  });
  return response;
}
