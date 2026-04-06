import { NextResponse } from "next/server";
import { readPlans } from "@/lib/claude-reader";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const plans = await readPlans();
    return NextResponse.json({ plans });
  } catch (err) {
    logger.error("Failed to load plans", { error: String(err) });
    return NextResponse.json(
      { error: "Failed to load plans" },
      { status: 500 },
    );
  }
}
