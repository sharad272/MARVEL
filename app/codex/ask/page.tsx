import Link from "next/link";
import { redirect } from "next/navigation";
import { CodexProfile } from "@/components/codex/codex-profile";
import { hasLlm } from "@/lib/llm/groq";

export const dynamic = "force-dynamic";

export const metadata = { title: "Ask the Codex" };

export default async function CodexAskPage({
  searchParams,
}: {
  searchParams: Promise<{ name?: string }>;
}) {
  const name = ((await searchParams).name ?? "").replace(/\s+/g, " ").trim().slice(0, 60);
  if (name.length < 2) redirect("/codex");

  return (
    <div className="page-shell mx-auto max-w-3xl px-4 pb-[calc(5.5rem+env(safe-area-inset-bottom))] sm:px-6 sm:pb-16">
      <Link href="/codex" className="text-[13px] font-semibold text-white/50 hover:text-white">
        ← Codex
      </Link>
      <h1 className="title-stroke mt-4 text-4xl font-black uppercase leading-[0.95] tracking-tight text-white sm:text-5xl">
        {name}
      </h1>
      <p className="mb-6 mt-2 text-[13px] text-white/45">
        Not in the stats database, so this profile comes from the Watcher alone.
      </p>
      <CodexProfile query={`name=${encodeURIComponent(name)}`} name={name} llmEnabled={hasLlm()} />
    </div>
  );
}
