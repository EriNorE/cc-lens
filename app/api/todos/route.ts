import { NextResponse } from "next/server";
import { readTodos } from "@/lib/claude-reader";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const todos = await readTodos();
    return NextResponse.json({ todos });
  } catch (err) {
    logger.error("Failed to load todos", { error: String(err) });
    return NextResponse.json(
      { error: "Failed to load todos" },
      { status: 500 },
    );
  }
}
