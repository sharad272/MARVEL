import type { LlmStreamEvent } from "@/lib/llm/events";

export function toSseResponse(events: AsyncIterable<LlmStreamEvent>): Response {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        controller.enqueue(encoder.encode(`: stream-open\n\n`));
        for await (const event of events) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
        }
      } catch (e) {
        const error = (e as Error).message || "The model stopped unexpectedly.";
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "error", error })}\n\n`));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-store, no-cache, no-transform, max-age=0",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
      "Content-Encoding": "identity",
    },
  });
}
