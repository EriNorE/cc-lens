import { NextResponse } from "next/server";
import {
  readSessionMeta,
  readFacet,
  getSessions,
  isValidSlug,
} from "@/lib/claude-reader";
import { estimateCostFromUsage } from "@/lib/pricing";

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
  const [meta, facet] = await Promise.all([readSessionMeta(id), readFacet(id)]);

  // readSessionMeta only finds session-meta/*.json files (legacy path).
  // Fall back to JSONL-derived sessions for machines without that directory.
  const resolved =
    meta ?? (await getSessions()).find((s) => s.session_id === id) ?? null;

  if (!resolved) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  const estimated_cost = estimateCostFromUsage(
    resolved.model ?? "claude-opus-4-6",
    {
      input_tokens: resolved.input_tokens ?? 0,
      output_tokens: resolved.output_tokens ?? 0,
      cache_creation_input_tokens: resolved.cache_creation_input_tokens ?? 0,
      cache_read_input_tokens: resolved.cache_read_input_tokens ?? 0,
    },
  );

  return NextResponse.json({ session: { ...resolved, facet, estimated_cost } });
}
