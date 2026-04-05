import fs from "fs/promises";
import path from "path";
import type { Facet } from "@/types/claude";
import { claudePath } from "./paths";

export async function readAllFacets(): Promise<Facet[]> {
  const dir = claudePath("usage-data", "session-facets");
  try {
    const files = await fs.readdir(dir);
    const results: Facet[] = [];
    await Promise.all(
      files
        .filter((f) => f.endsWith(".json"))
        .map(async (f) => {
          try {
            const raw = await fs.readFile(path.join(dir, f), "utf-8");
            results.push(JSON.parse(raw) as Facet);
          } catch {
            // Expected: skip malformed facet files
          }
        }),
    );
    return results;
  } catch {
    return []; // Expected: facets dir may not exist
  }
}

export async function readFacet(sessionId: string): Promise<Facet | null> {
  try {
    const raw = await fs.readFile(
      claudePath("usage-data", "session-facets", `${sessionId}.json`),
      "utf-8",
    );
    return JSON.parse(raw) as Facet;
  } catch {
    return null; // Expected: facet may not exist
  }
}
