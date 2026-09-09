import { AskClient } from "@/components/ask-client";
import { hasLlm } from "@/lib/llm/groq";
import { getCatalogStats } from "@/lib/queries";

export const dynamic = "force-dynamic";
export const maxDuration = 90;

export const metadata = {
  title: "Ask the Watcher",
  description: "Ask anything about the Marvel catalog in plain English.",
};

type Search = { searchParams: Promise<{ q?: string }> };

export default async function AskPage({ searchParams }: Search) {
  const stats = await getCatalogStats();
  const { q } = await searchParams;
  const query = q?.trim() ?? "";

  return (
    <div className="page-shell mx-auto max-w-3xl px-4 pb-16 sm:px-6">
      <header className="mb-8 text-center">
        <p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-marvel-400">
          Powered by an open-weights model
        </p>
        <h1 className="text-3xl font-black tracking-tight text-white sm:text-4xl">
          Ask the Watcher
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-pretty leading-relaxed text-white/55">
          Grounded on all {stats.titles} titles in your catalog. Ask for a
          film, a watch-order, or a character&rsquo;s arc — then play the
          trailer from the answer.
        </p>
      </header>

      <AskClient
        enabled={hasLlm()}
        initialQuery={query}
        hosted={Boolean(process.env.VERCEL)}
      />
    </div>
  );
}
