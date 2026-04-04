// middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const COOKIE_NAME = "cc-lens-session";
const TOKEN_QUERY_PARAM = "token";

const PUBLIC_PATHS = ["/login", "/api/auth", "/favicon.ico"];

function isPublic(pathname: string): boolean {
  if (pathname.startsWith("/_next/")) return true;
  return PUBLIC_PATHS.some(
    (p) => pathname === p || pathname.startsWith(p + "/"),
  );
}

async function makeSessionValue(token: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(token),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode("cc-lens-session"),
  );
  return Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

export async function proxy(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;

  if (isPublic(pathname)) return NextResponse.next();

  const token = process.env.CC_LENS_TOKEN ?? "";
  if (!token) return NextResponse.next();

  // Check session cookie
  const cookie = request.cookies.get(COOKIE_NAME)?.value;
  if (cookie) {
    const expected = await makeSessionValue(token);
    if (timingSafeEqual(cookie, expected)) return NextResponse.next();
  }

  // Check token in query param (auto-login from CLI browser open)
  const queryToken = searchParams.get(TOKEN_QUERY_PARAM);
  if (queryToken && timingSafeEqual(queryToken, token)) {
    const cleanUrl = request.nextUrl.clone();
    cleanUrl.searchParams.delete(TOKEN_QUERY_PARAM);
    const response = NextResponse.redirect(cleanUrl);
    response.cookies.set(COOKIE_NAME, await makeSessionValue(token), {
      httpOnly: true,
      sameSite: "strict",
      secure: process.env.NODE_ENV === "production",
      path: "/",
    });
    return response;
  }

  // Redirect to login
  const loginUrl = request.nextUrl.clone();
  loginUrl.pathname = "/login";
  loginUrl.search = "";
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
};
