import { NextResponse } from "next/server";
import fs from "fs/promises";
import fsSync from "fs";
import path from "path";
import os from "os";
import pkg from "../../../package.json";

export const dynamic = "force-dynamic";

const CLAUDE_DIR = path.join(os.homedir(), ".claude");
const PROJECT_ROOT = path.resolve(
  path.dirname(new URL(import.meta.url).pathname),
  "../../..",
);

function countLines(filePath: string): number {
  try {
    return fsSync.readFileSync(filePath, "utf-8").split("\n").length;
  } catch {
    return 0;
  }
}

function findMaxFileLines(dirs: string[]): { file: string; lines: number } {
  let max = { file: "", lines: 0 };
  for (const dir of dirs) {
    const fullDir = path.join(PROJECT_ROOT, dir);
    try {
      const entries = fsSync.readdirSync(fullDir, {
        withFileTypes: true,
        recursive: true,
      });
      for (const e of entries) {
        if (!e.isFile()) continue;
        if (!e.name.endsWith(".ts") && !e.name.endsWith(".tsx")) continue;
        const fp = path.join(e.parentPath, e.name);
        const lines = countLines(fp);
        if (lines > max.lines)
          max = { file: fp.replace(PROJECT_ROOT + "/", ""), lines };
      }
    } catch {
      /* dir may not exist */
    }
  }
  return max;
}

function countDir(dir: string, filter?: (name: string) => boolean): number {
  try {
    const entries = fsSync.readdirSync(path.join(PROJECT_ROOT, dir), {
      withFileTypes: true,
    });
    return filter
      ? entries.filter((e) => filter(e.name)).length
      : entries.length;
  } catch {
    return 0;
  }
}

export async function GET() {
  let claudeDir = false;
  try {
    await fs.access(CLAUDE_DIR);
    claudeDir = true;
  } catch {
    /* unreadable */
  }

  const maxFile = findMaxFileLines(["lib", "app"]);
  const architecture = {
    maxFileLines: maxFile.lines,
    maxFile: maxFile.file,
    testCount: countDir(
      "__tests__",
      (n) => n.endsWith(".test.ts") || n.endsWith(".test.tsx"),
    ),
    readerModuleCount: countDir("lib/readers", (n) => n.endsWith(".ts")),
    apiRouteCount: countDir("app/api"),
  };

  const status = !claudeDir
    ? "degraded"
    : maxFile.lines > 800
      ? "warning"
      : "ok";

  return NextResponse.json({
    status,
    version: pkg.version,
    claudeDir,
    architecture,
  });
}
