import { NextResponse } from "next/server";
import { findSessionJSONL, isValidSlug } from "@/lib/claude-reader";
import { parseSessionReplay } from "@/lib/replay-parser";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!isValidSlug(id)) {
    return NextResponse.json(
      {
        error: "Invalid session ID — must not contain path separators or '..'",
      },
      { status: 400 },
    );
  }
  const jsonlPath = await findSessionJSONL(id);

  if (!jsonlPath) {
    return NextResponse.json(
      { error: "Session JSONL not found" },
      { status: 404 },
    );
  }

  const replay = await parseSessionReplay(jsonlPath, id);
  return NextResponse.json(replay);
}
