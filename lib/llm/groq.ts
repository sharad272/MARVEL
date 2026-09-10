/**
 * OpenAI-compatible chat client.
 *
 * Hugging Face Inference Providers is the primary backend (gpt-oss-120b
 * via the router). Groq remains a fallback if only GROQ_API_KEY is set.
 */

import { runtimeEnv } from "@/lib/env";

export type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type ChatOptions = {
  temperature?: number;
  maxTokens?: number;
  /** Ask the model for a JSON object. Falls back to brace-extraction. */
  json?: boolean;
  /**
   * gpt-oss is a reasoning model: it spends completion tokens thinking
   * before it emits any answer. "low" keeps latency usable for inline UI.
   */
  reasoningEffort?: "low" | "medium" | "high";
  signal?: AbortSignal;
};

const MIN_COMPLETION_TOKENS = 512;

export class LlmUnavailableError extends Error {
  readonly code: "rate_limit" | "credits" | "auth" | "unavailable";
  readonly retryAfterSec?: number;

  constructor(
    message: string,
    code: "rate_limit" | "credits" | "auth" | "unavailable" = "unavailable",
    retryAfterSec?: number
  ) {
    super(message);
    this.name = "LlmUnavailableError";
    this.code = code;
    this.retryAfterSec = retryAfterSec;
  }
}

export function llmJsonError(e: unknown): {
  status: number;
  body: { error: string; code?: string; retryAfter?: number };
} {
  if (e instanceof LlmUnavailableError) {
    const status = e.code === "rate_limit" ? 429 : e.code === "auth" ? 401 : 503;
    return {
      status,
      body: { error: e.message, code: e.code, retryAfter: e.retryAfterSec },
    };
  }
  return { status: 500, body: { error: (e as Error).message } };
}

type LlmConfig = {
  provider: "huggingface" | "groq";
  apiKey: string;
  baseUrl: string;
  model: string;
};

export function hasLlm(): boolean {
  return Boolean(readKey());
}

export function llmModel(): string {
  try {
    return config().model;
  } catch {
    return runtimeEnv("LLM_MODEL") || "openai/gpt-oss-120b";
  }
}

export function llmProviderLabel(): string {
  try {
    return config().provider === "huggingface" ? "Hugging Face" : "Groq";
  } catch {
    return "LLM";
  }
}

function groqConfig(): LlmConfig | null {
  const groq = runtimeEnv("GROQ_API_KEY");
  if (!groq) return null;
  return {
    provider: "groq",
    apiKey: groq,
    baseUrl: (runtimeEnv("GROQ_BASE_URL") || "https://api.groq.com/openai/v1").replace(/\/$/, ""),
    model: runtimeEnv("GROQ_MODEL") || runtimeEnv("LLM_MODEL") || "openai/gpt-oss-120b",
  };
}

function parseRetryAfter(res: Response, text: string): number | undefined {
  const header = res.headers.get("retry-after");
  if (header) {
    const secs = Number(header);
    if (Number.isFinite(secs) && secs > 0) return Math.round(secs);
    const when = Date.parse(header);
    if (Number.isFinite(when)) return Math.max(1, Math.round((when - Date.now()) / 1000));
  }
  const match = text.match(/(\d+)\s*(?:seconds?|s)\b/i);
  if (match) return Number(match[1]);
  return undefined;
}

function waitPhrase(sec?: number): string {
  if (!sec) return "Wait a moment and try again.";
  if (sec < 60) return `Try again in about ${Math.max(5, sec)} seconds.`;
  const min = Math.max(1, Math.round(sec / 60));
  return `Try again in about ${min} minute${min === 1 ? "" : "s"}.`;
}

function isRateLimited(status: number, text: string): boolean {
  if (status === 429) return true;
  return /rate.?limit|too many requests|tpm_limit|rpm_limit|quota exceeded/i.test(text);
}

function throwProviderHttp(res: Response, text: string, provider: string): never {
  if (res.status === 401) {
    throw new LlmUnavailableError(
      provider === "huggingface"
        ? "Hugging Face rejected the API token."
        : "Groq rejected the API key.",
      "auth"
    );
  }
  if (res.status === 402) {
    throw new LlmUnavailableError(
      "Hugging Face Inference credits are used up. Add credits at huggingface.co/settings/billing.",
      "credits"
    );
  }
  if (isRateLimited(res.status, text)) {
    const wait = parseRetryAfter(res, text);
    throw new LlmUnavailableError(
      `The Watcher is rate-limited right now. ${waitPhrase(wait)}`,
      "rate_limit",
      wait
    );
  }
  throw new Error(`${provider} ${res.status}: ${text.slice(0, 300)}`);
}

function readKey(): string {
  return (
    runtimeEnv("HF_TOKEN") ||
    runtimeEnv("HUGGINGFACE_API_KEY") ||
    runtimeEnv("GROQ_API_KEY")
  );
}

function config(): LlmConfig {
  const hf = runtimeEnv("HF_TOKEN") || runtimeEnv("HUGGINGFACE_API_KEY");
  if (hf) {
    return {
      provider: "huggingface",
      apiKey: hf,
      baseUrl: (runtimeEnv("HF_BASE_URL") || "https://router.huggingface.co/v1").replace(
        /\/$/,
        ""
      ),
      model: runtimeEnv("LLM_MODEL") || "openai/gpt-oss-120b",
    };
  }

  const groq = runtimeEnv("GROQ_API_KEY");
  if (!groq) throw new LlmUnavailableError("No LLM API key is configured.");

  return {
    provider: "groq",
    apiKey: groq,
    baseUrl: (runtimeEnv("GROQ_BASE_URL") || "https://api.groq.com/openai/v1").replace(
      /\/$/,
      ""
    ),
    model: runtimeEnv("GROQ_MODEL") || runtimeEnv("LLM_MODEL") || "openai/gpt-oss-120b",
  };
}

function messageContent(choice: {
  message?: {
    content?: string | { type?: string; text?: string }[];
    reasoning?: string;
    reasoning_content?: string;
  };
  finish_reason?: string;
} | undefined): string {
  const raw = choice?.message?.content;
  if (typeof raw === "string" && raw.trim()) return raw.trim();
  if (Array.isArray(raw)) {
    const joined = raw
      .map((part) => (typeof part === "string" ? part : part.text ?? ""))
      .join("")
      .trim();
    if (joined) return joined;
  }
  return "";
}

export async function chat(messages: ChatMessage[], options: ChatOptions = {}): Promise<string> {
  return complete(config(), messages, options);
}

/**
 * Token stream for live UI. Yields assistant content only (reasoning
 * deltas from gpt-oss are dropped so the user sees the answer, not the
 * scratchpad).
 */
export async function* chatStream(
  messages: ChatMessage[],
  options: ChatOptions = {}
): AsyncGenerator<string> {
  yield* streamComplete(config(), messages, options);
}

async function complete(
  cfg: LlmConfig,
  messages: ChatMessage[],
  options: ChatOptions,
  allowFallback = true
): Promise<string> {
  const maxTokens = Math.max(options.maxTokens ?? 1024, MIN_COMPLETION_TOKENS);
  const modelsToTry =
    cfg.provider === "huggingface" && !cfg.model.includes(":")
      ? [cfg.model, `${cfg.model}:fastest`]
      : [cfg.model];

  let lastError = "";

  for (const model of modelsToTry) {
    const body: Record<string, unknown> = {
      model,
      messages,
      temperature: options.temperature ?? 0.3,
      max_tokens: maxTokens,
    };

    if (cfg.provider === "groq") {
      body.max_completion_tokens = maxTokens;
    }
    body.reasoning_effort = options.reasoningEffort ?? "low";

    if (options.json) {
      body.response_format = { type: "json_object" };
    }

    const res = await fetch(`${cfg.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${cfg.apiKey}`,
      },
      body: JSON.stringify(body),
      signal: options.signal,
      cache: "no-store",
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      lastError = `${res.status}: ${text.slice(0, 300)}`;

      const groq = groqConfig();
      if (
        allowFallback &&
        cfg.provider === "huggingface" &&
        groq &&
        (res.status === 402 || isRateLimited(res.status, text))
      ) {
        return complete(groq, messages, options, false);
      }

      if ((res.status === 400 || res.status === 422) && (options.json || body.reasoning_effort)) {
        const retry = await fetch(`${cfg.baseUrl}/chat/completions`, {
          method: "POST",
          headers: {
            "content-type": "application/json",
            authorization: `Bearer ${cfg.apiKey}`,
          },
          body: JSON.stringify({
            model,
            messages,
            temperature: options.temperature ?? 0.3,
            max_tokens: maxTokens,
            ...(cfg.provider === "groq" ? { max_completion_tokens: maxTokens } : {}),
          }),
          signal: options.signal,
          cache: "no-store",
        });
        if (retry.ok) {
          return readChoice(await retry.json());
        }
        lastError = `${retry.status}: ${(await retry.text().catch(() => "")).slice(0, 300)}`;
      }

      if (res.status === 404 || res.status === 400) continue;
      throwProviderHttp(res, text, cfg.provider);
    }

    return readChoice(await res.json());
  }

  throw new Error(`${cfg.provider} ${lastError || "did not return a completion."}`);
}

async function* streamComplete(
  cfg: LlmConfig,
  messages: ChatMessage[],
  options: ChatOptions,
  allowFallback = true
): AsyncGenerator<string> {
  const maxTokens = Math.max(options.maxTokens ?? 1024, MIN_COMPLETION_TOKENS);
  const modelsToTry =
    cfg.provider === "huggingface" && !cfg.model.includes(":")
      ? [cfg.model, `${cfg.model}:fastest`]
      : [cfg.model];

  let lastError = "";

  for (const model of modelsToTry) {
    const body: Record<string, unknown> = {
      model,
      messages,
      temperature: options.temperature ?? 0.3,
      max_tokens: maxTokens,
      stream: true,
    };

    if (cfg.provider === "groq") {
      body.max_completion_tokens = maxTokens;
    }
    body.reasoning_effort = options.reasoningEffort ?? "low";

    const res = await fetch(`${cfg.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${cfg.apiKey}`,
        accept: "text/event-stream",
      },
      body: JSON.stringify(body),
      signal: options.signal,
      cache: "no-store",
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      lastError = `${res.status}: ${text.slice(0, 300)}`;

      const groq = groqConfig();
      if (
        allowFallback &&
        cfg.provider === "huggingface" &&
        groq &&
        (res.status === 402 || isRateLimited(res.status, text))
      ) {
        yield* streamComplete(groq, messages, options, false);
        return;
      }

      if (res.status === 404 || res.status === 400) continue;
      throwProviderHttp(res, text, cfg.provider);
    }

    let yielded = false;
    for await (const piece of readSseContent(res)) {
      if (piece) {
        yielded = true;
        yield piece;
      }
    }
    if (yielded) return;
    lastError = "empty stream";
  }

  throw new Error(`${cfg.provider} ${lastError || "did not return a completion."}`);
}

async function* readSseContent(res: Response): AsyncGenerator<string> {
  if (!res.body) return;
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    const lines = buf.split("\n");
    buf = lines.pop() ?? "";
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith("data:")) continue;
      const data = trimmed.slice(5).trim();
      if (!data || data === "[DONE]") continue;
      try {
        const piece = deltaContent(JSON.parse(data) as {
          choices?: { delta?: { content?: unknown } }[];
        });
        if (piece) yield piece;
      } catch {
        // Keep reading; a truncated JSON frame will complete on the next chunk.
      }
    }
  }
}

function deltaContent(chunk: { choices?: { delta?: { content?: unknown } }[] }): string {
  const raw = chunk.choices?.[0]?.delta?.content;
  if (typeof raw === "string") return raw;
  if (Array.isArray(raw)) {
    return raw
      .map((part) => (typeof part === "string" ? part : (part as { text?: string }).text ?? ""))
      .join("");
  }
  return "";
}

function readChoice(data: {
  choices?: {
    message?: {
      content?: string | { type?: string; text?: string }[];
      reasoning?: string;
      reasoning_content?: string;
    };
    finish_reason?: string;
  }[];
}): string {
  const choice = data.choices?.[0];
  const content = messageContent(choice);

  if (!content && choice?.finish_reason === "length") {
    throw new Error(
      "Model exhausted its token budget while reasoning. Raise maxTokens or lower reasoningEffort."
    );
  }

  return content;
}

export async function chatJson<T>(
  messages: ChatMessage[],
  options: Omit<ChatOptions, "json"> = {}
): Promise<T> {
  const parse = (raw: string): T => {
    if (!raw) throw new Error("Model returned an empty response.");
    try {
      return JSON.parse(raw) as T;
    } catch {
      const extracted = extractJsonObject(raw);
      if (!extracted) throw new Error(`Model did not return JSON: ${raw.slice(0, 200)}`);
      return JSON.parse(extracted) as T;
    }
  };

  try {
    return parse(await chat(messages, { ...options, json: true }));
  } catch (first) {
    try {
      return parse(
        await chat(messages, {
          ...options,
          json: false,
          maxTokens: Math.max(options.maxTokens ?? 1024, 4096),
        })
      );
    } catch {
      throw first;
    }
  }
}

export function extractJsonObject(text: string): string | null {
  const start = text.indexOf("{");
  if (start === -1) return null;

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let i = start; i < text.length; i++) {
    const ch = text[i];

    if (inString) {
      if (escaped) escaped = false;
      else if (ch === "\\") escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }

    if (ch === '"') inString = true;
    else if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) return text.slice(start, i + 1);
    }
  }
  return null;
}
