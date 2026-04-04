// lib/auth.ts
import crypto from "crypto";

const TOKEN_ENV = "CC_LENS_TOKEN";

function getToken(): string {
  const token = process.env[TOKEN_ENV];
  if (!token)
    throw new Error("CC_LENS_TOKEN not set — this should be set by bin/cli.js");
  return token;
}

export function verifyToken(input: string): boolean {
  const token = getToken();
  if (input.length !== token.length) return false;
  return crypto.timingSafeEqual(Buffer.from(input), Buffer.from(token));
}

export function generateSessionCookie(): string {
  const token = getToken();
  return crypto
    .createHmac("sha256", token)
    .update("cc-lens-session")
    .digest("hex");
}

export function verifySessionCookie(cookie: string): boolean {
  const expected = generateSessionCookie();
  if (cookie.length !== expected.length) return false;
  return crypto.timingSafeEqual(Buffer.from(cookie), Buffer.from(expected));
}

export const COOKIE_NAME = "cc-lens-session";
export const TOKEN_QUERY_PARAM = "token";
