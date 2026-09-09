import { NextResponse } from "next/server";
import { spawn } from "node:child_process";
import path from "node:path";
import { getMediaRoot } from "@/lib/media/root";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

/**
 * Runs the existing scanner as a child process so the CLI and the UI
 * share one implementation. The response waits until it exits.
 */
export async function POST() {
  const root = await getMediaRoot();
  if (!root) {
    return NextResponse.json({ error: "Set a media folder in Settings first." }, { status: 400 });
  }

  const cwd = process.cwd();
  const script = path.join(cwd, "scripts", "scan-media.ts");

  const output = await new Promise<{ code: number; log: string }>((resolve) => {
    const child = spawn(
      process.platform === "win32" ? "npx.cmd" : "npx",
      ["tsx", script],
      {
        cwd,
        env: { ...process.env, LOCAL_MEDIA_ROOT: root },
        shell: process.platform === "win32",
      }
    );

    let log = "";
    child.stdout?.on("data", (d) => {
      log += d.toString();
    });
    child.stderr?.on("data", (d) => {
      log += d.toString();
    });
    child.on("error", (err) => resolve({ code: 1, log: err.message }));
    child.on("close", (code) => resolve({ code: code ?? 1, log }));
  });

  if (output.code !== 0) {
    return NextResponse.json(
      { error: output.log.slice(-800) || "Scan failed" },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, log: output.log.slice(-2000) });
}
