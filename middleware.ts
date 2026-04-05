import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const ALLOWED_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);

export function middleware(request: NextRequest) {
  // Layer 1: If server is bound to a non-localhost address, block all API access.
  // cc-lens is designed for local use only — public binding disables the data API.
  const bindHost = process.env.CC_LENS_HOST || "127.0.0.1";
  if (!ALLOWED_HOSTS.has(bindHost)) {
    return NextResponse.json(
      { error: "Forbidden — cc-lens API disabled on non-localhost bind" },
      { status: 403 },
    );
  }

  // Layer 2: Defense-in-depth Host header check.
  // Primary security boundary is TCP bind to 127.0.0.1 (bin/cli.js).
  const host = request.headers.get("host")?.split(":")[0] ?? "";
  if (!ALLOWED_HOSTS.has(host)) {
    return NextResponse.json(
      { error: "Forbidden — cc-lens is localhost-only" },
      { status: 403 },
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: "/api/:path*",
};
