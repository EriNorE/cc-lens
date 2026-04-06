import { NextResponse } from "next/server";
import {
  readSettings,
  getClaudeStorageBytes,
  readSkills,
  readInstalledPlugins,
} from "@/lib/claude-reader";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [settings, storageBytes, skills, plugins] = await Promise.all([
      readSettings(),
      getClaudeStorageBytes(),
      readSkills(),
      readInstalledPlugins(),
    ]);
    return NextResponse.json({ settings, storageBytes, skills, plugins });
  } catch (err) {
    logger.error("Failed to load settings", { error: String(err) });
    return NextResponse.json(
      { error: "Failed to load settings" },
      { status: 500 },
    );
  }
}
