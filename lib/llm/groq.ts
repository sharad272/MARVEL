/**
 * OpenAI-compatible chat client.
 *
 * Hugging Face Inference Providers is the primary backend (gpt-oss-120b
 * via the router). Groq remains a fallback if only GROQ_API_KEY is set.
 */

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
  constructor(message: string) {
    super(message);
    this.name = "LlmUnavailableError";
  }
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
    return process.env.LLM_MODEL?.trim() || "openai/gpt-oss-120b";
  }
}

export function llmProviderLabel(): string {
  try {
    return config().provider === "huggingface" ? "Hugging Face" : "Groq";
  } catch {
    return "LLM";
  }
}

function readKey(): string {
  return (
    process.env.HF_TOKEN?.trim() ||
    process.env.HUGGINGFACE_API_KEY?.trim() ||
    process.env.GROQ_API_KEY?.trim() ||
    ""
  );
}

function config(): LlmConfig {
  const hf =
    process.env.HF_TOKEN?.trim() || process.env.HUGGINGFACE_API_KEY?.trim();
  if (hf) {
    return {
      provider: "huggingface",
      apiKey: hf,
      baseUrl: (process.env.HF_BASE_URL || "https://router.huggingface.co/v1").replace(
        /\/$/,
        ""
      ),
      model: process.env.LLM_MODEL?.trim() || "openai/gpt-oss-120b",
    };
  }

  const groq = process.env.GROQ_API_KEY?.trim();
  if (!groq) throw new LlmUnavailableError("No LLM API key is configured.");

  return {
    provider: "groq",
    apiKey: groq,
    baseUrl: (process.env.GROQ_BASE_URL || "https://api.groq.com/openai/v1").replace(
      /\/$/,
      ""
    ),
    model: process.env.GROQ_MODEL?.trim() || process.env.LLM_MODEL?.trim() || "openai/gpt-oss-120b",
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

      if (res.status === 401) {
        throw new LlmUnavailableError(
          cfg.provider === "huggingface"
            ? "Hugging Face rejected the API token."
            : "Groq rejected the API key."
        );
      }
      if (res.status === 402) {
        const groqFallback = process.env.GROQ_API_KEY?.trim();
        if (allowFallback && cfg.provider === "huggingface" && groqFallback) {
          return complete(
            {
              provider: "groq",
              apiKey: groqFallback,
              baseUrl: (process.env.GROQ_BASE_URL || "https://api.groq.com/openai/v1").replace(
                /\/$/,
                ""
              ),
              model:
                process.env.GROQ_MODEL?.trim() ||
                process.env.LLM_MODEL?.trim() ||
                "openai/gpt-oss-120b",
            },
            messages,
            options,
            false
          );
        }
        throw new LlmUnavailableError(
          "Hugging Face Inference credits are used up. Add credits at huggingface.co/settings/billing."
        );
      }
      if (res.status === 429) {
        throw new LlmUnavailableError("The model is rate-limited — try again shortly.");
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
      throw new Error(`${cfg.provider} ${lastError}`);
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

      if (res.status === 401) {
        throw new LlmUnavailableError(
          cfg.provider === "huggingface"
            ? "Hugging Face rejected the API token."
            : "Groq rejected the API key."
        );
      }
      if (res.status === 402) {
        const groqFallback = process.env.GROQ_API_KEY?.trim();
        if (allowFallback && cfg.provider === "huggingface" && groqFallback) {
          yield* streamComplete(
            {
              provider: "groq",
              apiKey: groqFallback,
              baseUrl: (process.env.GROQ_BASE_URL || "https://api.groq.com/openai/v1").replace(
                /\/$/,
                ""
              ),
              model:
                process.env.GROQ_MODEL?.trim() ||
                process.env.LLM_MODEL?.trim() ||
                "openai/gpt-oss-120b",
            },
            messages,
            options,
            false
          );
          return;
        }
        throw new LlmUnavailableError(
          "Hugging Face Inference credits are used up. Add credits at huggingface.co/settings/billing."
        );
      }
      if (res.status === 429) {
        throw new LlmUnavailableError("The model is rate-limited — try again shortly.");
      }
      if (res.status === 404 || res.status === 400) continue;
      throw new Error(`${cfg.provider} ${lastError}`);
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
