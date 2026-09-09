import path from "node:path";
import { promises as fs } from "node:fs";
import { db } from "@/lib/db";

const MEDIA_ROOT_KEY = "mediaRoot";
const FILE_SETTINGS = path.join(process.cwd(), ".marvelverse.json");

type FileSettings = { mediaRoot?: string };

async function readFileSettings(): Promise<FileSettings> {
  try {
    const raw = await fs.readFile(FILE_SETTINGS, "utf8");
    return JSON.parse(raw) as FileSettings;
  } catch {
    return {};
  }
}

async function writeFileSettings(patch: FileSettings) {
  const current = await readFileSettings();
  await fs.writeFile(FILE_SETTINGS, JSON.stringify({ ...current, ...patch }, null, 2), "utf8");
}

/**
 * Folder of media the user owns. Env wins (so `.env.local` still works);
 * then a local JSON file; then Settings saved in SQLite. Compared with
 * `path.resolve` so the streaming route and the scanner agree.
 *
 * Prisma is optional here: a missing AppSetting table must not take down
 * the watch page.
 */
export async function getMediaRoot(): Promise<string> {
  const fromEnv = process.env.LOCAL_MEDIA_ROOT?.trim();
  if (fromEnv) return path.resolve(fromEnv);

  const fromFile = (await readFileSettings()).mediaRoot?.trim();
  if (fromFile) return path.resolve(fromFile);

  try {
    const row = await db.appSetting.findUnique({ where: { key: MEDIA_ROOT_KEY } });
    const value = row?.value.trim();
    return value ? path.resolve(value) : "";
  } catch {
    return "";
  }
}

export async function setMediaRoot(dir: string): Promise<string> {
  const resolved = path.resolve(dir.trim());
  await writeFileSettings({ mediaRoot: resolved });
  try {
    await db.appSetting.upsert({
      where: { key: MEDIA_ROOT_KEY },
      update: { value: resolved },
      create: { key: MEDIA_ROOT_KEY, value: resolved },
    });
  } catch {
    // SQLite schema may not have AppSetting yet; the JSON file is enough.
  }
  return resolved;
}

/** True when `filePath` is inside `root` (after resolving `..` segments). */
export function isInsideRoot(filePath: string, root: string): boolean {
  const rootPath = path.resolve(root);
  const prefix = rootPath.endsWith(path.sep) ? rootPath : rootPath + path.sep;
  return path.resolve(filePath).startsWith(prefix);
}
