import fs from "fs/promises";
import path from "path";
import { CLAUDE_DIR } from "./paths";

export async function getClaudeStorageBytes(): Promise<number> {
  // Use du for speed — recursive stat on 4.9GB dir takes ~4s vs ~0.3s for du
  try {
    const { execFile } = await import("child_process");
    const { promisify } = await import("util");
    const execFileAsync = promisify(execFile);
    const { stdout } = await execFileAsync("du", ["-sk", CLAUDE_DIR]);
    const kb = parseInt(stdout.split("\t")[0], 10);
    if (!isNaN(kb)) return kb * 1024;
  } catch {
    // Expected: du may not be available, fall through to Node.js fallback
  }

  async function dirSize(dirPath: string): Promise<number> {
    let total = 0;
    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });
      await Promise.all(
        entries.map(async (e) => {
          const full = path.join(dirPath, e.name);
          if (e.isDirectory()) {
            total += await dirSize(full);
          } else {
            try {
              const stat = await fs.stat(full);
              total += stat.size;
            } catch {
              // Expected: skip inaccessible files
            }
          }
        }),
      );
    } catch {
      // Expected: skip inaccessible dirs
    }
    return total;
  }
  return dirSize(CLAUDE_DIR);
}
