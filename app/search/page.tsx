import { SearchClient } from "@/components/search-client";
import { searchTitles } from "@/lib/queries";
import { hasLlm } from "@/lib/llm/groq";

export const dynamic = "force-dynamic";

export const metadata = { title: "Search" };

type Search = { searchParams: Promise<{ q?: string }> };

export default async function SearchPage({ searchParams }: Search) {
  const { q } = await searchParams;
  const initial = q ? await searchTitles(q, 30) : [];

  return (
    <div className="page-shell mx-auto max-w-[1600px] px-4 pb-16 sm:px-6 lg:px-10">
      <SearchClient
        initialQuery={q ?? ""}
        initialResults={initial}
        llmEnabled={hasLlm()}
      />
    </div>
  );
}
