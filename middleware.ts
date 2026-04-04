// middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import crypto from "crypto";

const COOKIE_NAME = "cc-lens-session";
const TOKEN_QUERY_PARAM = "token";

const PUBLIC_PATHS = ["/login", "/api/auth", "/favicon.ico"];

function isPublic(pathname: string): boolean {
  if (pathname.startsWith("/_next/")) return true;
  return PUBLIC_PATHS.some(
    (p) => pathname === p || pathname.startsWith(p + "/"),
  );
}

function makeSessionValue(token: string): string {
  return crypto
    .createHmac("sha256", token)
    .update("cc-lens-session")
    .digest("hex");
}

export function middleware(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;

  if (isPublic(pathname)) return NextResponse.next();

  const token = process.env.CC_LENS_TOKEN ?? "";
  if (!token) return NextResponse.next(); // no auth configured

  // Check session cookie
  const cookie = request.cookies.get(COOKIE_NAME)?.value;
  if (cookie) {
    const expected = makeSessionValue(token);
    if (cookie.length === expected.length) {
      try {
        const valid = crypto.timingSafeEqual(
          Buffer.from(cookie),
          Buffer.from(expected),
        );
        if (valid) return NextResponse.next();
      } catch {
        /* length mismatch, fall through */
      }
    }
  }

  // Check token in query param (auto-login from CLI browser open)
  const queryToken = searchParams.get(TOKEN_QUERY_PARAM);
  if (queryToken && queryToken === token) {
    const cleanUrl = request.nextUrl.clone();
    cleanUrl.searchParams.delete(TOKEN_QUERY_PARAM);
    const response = NextResponse.redirect(cleanUrl);
    response.cookies.set(COOKIE_NAME, makeSessionValue(token), {
      httpOnly: true,
      sameSite: "strict",
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
