import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getMediaRoot } from "@/lib/media/root";

export const dynamic = "force-dynamic";

/**
 * Containers the scanner indexes but browsers cannot decode (avi, wmv, flv,
 * mpg) fall through to a generic type rather than being advertised as video
 * the player can handle.
 */
const CONTENT_TYPES: Record<string, string> = {
  mp4: "video/mp4",
  m4v: "video/x-m4v",
  webm: "video/webm",
  mkv: "video/x-matroska",
  mov: "video/quicktime",
  ts: "video/mp2t",
  m2ts: "video/mp2t",
  m3u8: "application/vnd.apple.mpegurl",
};

type RangeResult =
  | { kind: "none" }
  | { kind: "invalid" }
  | { kind: "range"; start: number; end: number };

/**
 * Reads a single `bytes=` range against a known file size. Multipart ranges
 * are legal HTTP but no <video> element asks for one, and answering with
 * only the first part would silently corrupt the response — so they are
 * rejected rather than half-honoured.
 */
function parseRange(header: string | null, size: number): RangeResult {
  if (!header) return { kind: "none" };

  const match = /^bytes=(\d*)-(\d*)$/.exec(header.trim());
  if (!match) return { kind: "invalid" };

  const [, rawStart, rawEnd] = match;
  if (rawStart === "" && rawEnd === "") return { kind: "invalid" };

  let start: number;
  let end: number;

  if (rawStart === "") {
    // Suffix form: "bytes=-500" means the last 500 bytes, which Safari uses
    // to sniff the moov atom at the tail of a badly muxed mp4.
    const suffix = Number(rawEnd);
    if (suffix === 0) return { kind: "invalid" };
    start = Math.max(0, size - suffix);
    end = size - 1;
  } else {
    start = Number(rawStart);
    // Players routinely ask past the end; clamping is the expected answer.
    end = rawEnd === "" ? size - 1 : Math.min(Number(rawEnd), size - 1);
  }

  if (!Number.isFinite(start) || !Number.isFinite(end)) return { kind: "invalid" };
  if (start > end || start >= size) return { kind: "invalid" };

  return { kind: "range", start, end };
}

/**
 * Node's fs streams are not web streams. These files run to several
 * gigabytes, so the body has to stay lazily pulled rather than being read
 * into a buffer first.
 */
function toWebStream(nodeStream: Readable): ReadableStream<Uint8Array> {
  return Readable.toWeb(nodeStream) as unknown as ReadableStream<Uint8Array>;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const media = await db.localMedia.findUnique({
    where: { id },
    select: { path: true, container: true },
  });
  if (!media) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const root = await getMediaRoot();
  if (!root) {
    return NextResponse.json({ error: "Local media is not configured" }, { status: 404 });
  }

  // The catalog lives in a SQLite file that anything on this machine can
  // write to. Without this check, one doctored `path` column turns the
  // route into an arbitrary-file read for the entire disk.
  const rootPath = path.resolve(root);
  const prefix = rootPath.endsWith(path.sep) ? rootPath : rootPath + path.sep;
  const filePath = path.resolve(media.path);
  if (!filePath.startsWith(prefix)) {
    return NextResponse.json({ error: "File is outside the media root" }, { status: 403 });
  }

  const info = await stat(filePath).catch(() => null);
  if (!info?.isFile()) {
    return NextResponse.json({ error: "File is missing from disk" }, { status: 404 });
  }

  const contentType = CONTENT_TYPES[media.container.toLowerCase()] ?? "application/octet-stream";
  const range = parseRange(request.headers.get("range"), info.size);

  if (range.kind === "invalid") {
    return NextResponse.json(
      { error: "Range not satisfiable" },
      {
        status: 416,
        headers: {
          "Content-Range": `bytes */${info.size}`,
          "Accept-Ranges": "bytes",
        },
      }
    );
  }

  if (range.kind === "none") {
    return new Response(toWebStream(createReadStream(filePath)), {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Length": String(info.size),
        "Accept-Ranges": "bytes",
      },
    });
  }

  // `end` is inclusive for both createReadStream and Content-Range, so the
  // two agree without an off-by-one adjustment.
  const { start, end } = range;
  return new Response(toWebStream(createReadStream(filePath, { start, end })), {
    status: 206,
    headers: {
      "Content-Type": contentType,
      "Content-Length": String(end - start + 1),
      "Content-Range": `bytes ${start}-${end}/${info.size}`,
      "Accept-Ranges": "bytes",
    },
  });
}
