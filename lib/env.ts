/**
 * Read process.env at runtime.
 *
 * Next.js inlines `process.env.SOME_KEY` at build time when it can see
 * the name statically. On Vercel, sensitive vars are often withheld from
 * the build, so that inlining becomes a permanent empty string and Ask
 * the Watcher shows "no model configured" even after the key is added.
 * Bracket access is not inlined, so the running function sees the real
 * runtime environment — production, preview, or `next dev`.
 */
export function runtimeEnv(name: string): string {
  return String(process.env[name] ?? "").trim();
}

export function isHosted(): boolean {
  return Boolean(runtimeEnv("VERCEL") || runtimeEnv("AWS_LAMBDA_FUNCTION_NAME"));
}
