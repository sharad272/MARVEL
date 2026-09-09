/**
 * Browser helpers for LLM calls. Keys stay on the server.
 *
 * Mobile Safari (and some Android WebViews) buffer or drop fetch()
 * ReadableStreams for text/event-stream, so Ask/recap/arc hang or throw
 * "empty stream". JSON is one complete response and works there.
 *
 * iPadOS 13+ often reports as Macintosh, so we also treat coarse pointers
 * and multi-touch MacIntel as mobile.
 */
export function preferJsonLlm(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod|Android/i.test(ua)) return true;
  if (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1) return true;
  if (typeof window !== "undefined" && window.matchMedia?.("(pointer: coarse)").matches) {
    return true;
  }
  return false;
}

export async function llmPost(
  url: string,
  body: Record<string, unknown>,
  signal?: AbortSignal,
  forceJson = false
): Promise<Response> {
  const jsonMode = forceJson || preferJsonLlm();
  return fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      accept: jsonMode ? "application/json" : "text/event-stream",
    },
    cache: "no-store",
    signal,
    body: JSON.stringify({ ...body, stream: !jsonMode }),
  });
}

export function isSse(res: Response): boolean {
  return (res.headers.get("content-type") ?? "").includes("text/event-stream") && Boolean(res.body);
}

export async function readLlmJson<T>(res: Response): Promise<T> {
  const json = (await res.json()) as T & { error?: string };
  if (!res.ok) throw new Error(json.error ?? `Request failed (${res.status})`);
  return json;
}
