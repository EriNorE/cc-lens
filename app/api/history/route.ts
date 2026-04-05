import { NextResponse } from "next/server";
import { readHistory } from "@/lib/claude-reader";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const parsed = parseInt(searchParams.get("limit") ?? "200", 10);
  const limit = Math.min(Number.isNaN(parsed) ? 200 : parsed, 10_000);
  const history = await readHistory(limit);
  return NextResponse.json({ history });
}
