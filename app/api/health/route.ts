import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import os from "os";

export const dynamic = "force-dynamic";

const CLAUDE_DIR = path.join(os.homedir(), ".claude");
const VERSION = "0.3.1";

export async function GET() {
  let claudeDir = false;
  try {
    await fs.access(CLAUDE_DIR);
    claudeDir = true;
  } catch {
    /* unreadable */
  }

  return NextResponse.json({
    status: claudeDir ? "ok" : "degraded",
    version: VERSION,
    claudeDir,
  });
}
