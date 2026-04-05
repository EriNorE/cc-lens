import { describe, it, expect, vi, afterEach } from "vitest";
import { NextRequest } from "next/server";
import { middleware } from "@/middleware";

function makeRequest(host: string): NextRequest {
  return new NextRequest(new URL("http://localhost:33033/api/stats"), {
    headers: { host },
  });
}

describe("middleware — localhost guard", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("allows localhost Host header", async () => {
    const res = middleware(makeRequest("localhost:33033"));
    expect(res.status).not.toBe(403);
  });

  it("allows 127.0.0.1 Host header", async () => {
    const res = middleware(makeRequest("127.0.0.1:33033"));
    expect(res.status).not.toBe(403);
  });

  it("blocks non-localhost Host header", async () => {
    const res = middleware(makeRequest("evil.com:33033"));
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toContain("localhost");
  });

  it("blocks when CC_LENS_HOST is 0.0.0.0", async () => {
    vi.stubEnv("CC_LENS_HOST", "0.0.0.0");
    const res = middleware(makeRequest("localhost:33033"));
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toContain("non-localhost");
  });

  it("allows when CC_LENS_HOST is 127.0.0.1", async () => {
    vi.stubEnv("CC_LENS_HOST", "127.0.0.1");
    const res = middleware(makeRequest("localhost:33033"));
    expect(res.status).not.toBe(403);
  });
});
