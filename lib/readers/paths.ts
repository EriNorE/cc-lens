import path from "path";
import os from "os";

export const CLAUDE_DIR = path.join(os.homedir(), ".claude");

export function claudePath(...segments: string[]): string {
  return path.join(CLAUDE_DIR, ...segments);
}

export function stripXmlTags(text: string): string {
  return text
    .replace(/<[^>]+>[\s\S]*?<\/[^>]+>/g, "")
    .replace(/<[^>]+\/>/g, "")
    .replace(/<[^>]+>/g, "")
    .trim();
}
