export function describeLlmError(raw: string): {
  title: string;
  body: string;
  rateLimited: boolean;
} {
  const text = raw.trim() || "The model stopped unexpectedly.";
  const lower = text.toLowerCase();
  const rateLimited =
    /rate.?limit|too many requests|429|try again in about|try again shortly|wait a moment and try again/.test(
      lower
    );

  if (rateLimited) {
    return {
      title: "The Watcher is rate-limited",
      body: /try again|wait a moment/.test(lower)
        ? text
        : "Too many requests right now. Wait a moment and try again.",
      rateLimited: true,
    };
  }

  return {
    title: "Couldn't get an answer",
    body: text,
    rateLimited: false,
  };
}
