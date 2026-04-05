import fs from "fs/promises";
import type { StatsCache } from "@/types/claude";
import { claudePath } from "./paths";

export async function readStatsCache(): Promise<StatsCache | null> {
  try {
    const raw = await fs.readFile(claudePath("stats-cache.json"), "utf-8");
    return JSON.parse(raw) as StatsCache;
  } catch {
    return null; // Expected: file may not exist
  }
}
