import type { TitleCard } from "@/lib/queries";

export type StreamBeat = { slug: string; beat: string; name?: string };

export type LlmStreamEvent =
  | { type: "kind"; kind: "search" | "prereqs" | "arc"; slug?: string; name?: string }
  | { type: "delta"; field: "answer" | "recap"; text: string }
  | { type: "titles"; role: "results" | "essential" | "helpful"; titles: TitleCard[] }
  | { type: "beats"; beats: StreamBeat[] }
  | { type: "done"; followups?: string[] }
  | { type: "error"; error: string };
