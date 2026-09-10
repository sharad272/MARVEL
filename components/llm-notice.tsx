"use client";

import { describeLlmError } from "@/lib/llm/notice";

export function LlmNotice({
  error,
  onRetry,
}: {
  error: string;
  onRetry?: () => void;
}) {
  const { title, body } = describeLlmError(error);

  return (
    <div
      role="alert"
      className="rounded-xl border border-amber-500/25 bg-amber-500/10 p-4"
    >
      <p className="text-sm font-semibold text-amber-300">{title}</p>
      <p className="mt-1 text-[13px] leading-relaxed text-amber-200/75">{body}</p>
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="mt-3 inline-flex min-h-9 items-center rounded-full bg-white/10 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-white/20"
        >
          Try again
        </button>
      ) : null}
    </div>
  );
}
