import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import os from "os";
import { readMemories } from "@/lib/claude-reader";

export const dynamic = "force-dynamic";

const CLAUDE_DIR = path.join(os.homedir(), ".claude");

export async function GET() {
  const memories = await readMemories();
  return NextResponse.json({ memories });
}

export async function PATCH(req: Request) {
  try {
    const { projectSlug, file, content } = (await req.json()) as {
      projectSlug?: string;
      file?: string;
      content?: string;
    };

    if (!projectSlug || !file || typeof content !== "string") {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    // Only allow .md files
    if (!file.endsWith(".md")) {
      return NextResponse.json(
        { error: "Only .md files allowed" },
        { status: 400 },
      );
    }

    // Prevent path traversal — slug and file must be plain names
    if (
      /[/\\]/.test(projectSlug) ||
      /[/\\]/.test(file) ||
      /\.\./.test(projectSlug) ||
      /\.\./.test(file)
    ) {
      return NextResponse.json({ error: "Invalid path" }, { status: 400 });
    }

    const allowedRoot = path.resolve(CLAUDE_DIR, "projects");
    const filePath = path.resolve(
      CLAUDE_DIR,
      "projects",
      projectSlug,
      "memory",
      file,
    );

    // Defense-in-depth: resolve() normalizes symlinks/dots, then check boundary
    if (!filePath.startsWith(allowedRoot + path.sep)) {
      return NextResponse.json(
        { error: "Path outside allowed directory" },
        { status: 403 },
      );
    }

    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, content, "utf-8");
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to write memory file" },
      { status: 500 },
    );
  }
}
