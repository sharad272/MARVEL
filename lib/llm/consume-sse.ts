import type { LlmStreamEvent } from "@/lib/llm/events";

export async function consumeSse(
  res: Response,
  onEvent: (event: LlmStreamEvent) => void
): Promise<void> {
  const ctype = res.headers.get("content-type") ?? "";

  if (!res.ok && !ctype.includes("text/event-stream")) {
    const text = await res.text();
    try {
      const json = JSON.parse(text) as { error?: string };
      throw new Error(json.error ?? `Request failed (${res.status})`);
    } catch (e) {
      if (e instanceof SyntaxError) {
        throw new Error(text.slice(0, 180) || `Request failed (${res.status})`);
      }
      throw e;
    }
  }

  if (!res.body) throw new Error("The model returned an empty stream.");

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    const frames = buf.split("\n\n");
    buf = frames.pop() ?? "";
    for (const frame of frames) emit(frame);
  }

  if (buf.trim()) emit(buf);

  function emit(frame: string) {
    const line = frame.split("\n").find((l) => l.startsWith("data:"));
    if (!line) return;
    const data = line.slice(5).trim();
    if (!data) return;
    try {
      onEvent(JSON.parse(data) as LlmStreamEvent);
    } catch {
      // Ignore a truncated JSON frame; the next chunk completes it.
    }
  }
}
