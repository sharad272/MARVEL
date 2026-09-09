/**
 * Verifies the Hugging Face (or Groq fallback) connection and JSON mode.
 *   npm run check:llm
 */

import "./env";
import { chat, chatJson, hasLlm, llmModel, llmProviderLabel } from "../lib/llm/groq";

async function main() {
  if (!hasLlm()) {
    console.error("HF_TOKEN is not set in .env.local");
    process.exit(1);
  }

  console.log(`provider: ${llmProviderLabel()}`);
  console.log(`model:    ${llmModel()}`);
  console.log(`base:     ${process.env.HF_BASE_URL || process.env.GROQ_BASE_URL}\n`);

  const plain = await chat([{ role: "user", content: "Reply with exactly: OK" }], {
    maxTokens: 64,
  });
  console.log(`plain text  -> ${JSON.stringify(plain)}`);

  const json = await chatJson<{ hero: string; films: number }>(
    [
      {
        role: "user",
        content:
          'Return JSON: { "hero": "Iron Man", "films": 3 } — the count of solo Iron Man films.',
      },
    ],
    { maxTokens: 256 }
  );
  console.log(`json mode   -> ${JSON.stringify(json)}`);

  console.log(`\n${llmProviderLabel()} is wired up correctly.`);
}

main().catch((e) => {
  console.error("\nLLM check failed:", e.message ?? e);
  process.exit(1);
});
