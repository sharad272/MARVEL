import { ExternalLink } from "lucide-react";
import { licensedWatchLinks } from "@/lib/online/watch-links";

export function LicensedWatch({
  name,
  franchise,
  region,
}: {
  name: string;
  franchise: string;
  region?: string;
}) {
  const links = licensedWatchLinks(name, franchise, region);

  return (
    <div className="panel panel-accent rounded-xl p-4">
      <h2 className="mb-1 text-xs font-bold uppercase tracking-widest text-white/50">
        Watch the full title
      </h2>
      <p className="mb-3 text-[12px] leading-relaxed text-white/45">
        The player here shows the official trailer. The movie itself lives on
        licensed services — jump out to one of these.
      </p>
      <ul className="space-y-1.5">
        {links.map((l) => (
          <li key={l.id}>
            <a
              href={l.href}
              target="_blank"
              rel="noreferrer noopener"
              className="flex items-center gap-3 rounded-lg p-2 transition-colors hover:bg-white/[0.07]"
            >
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-white">
                  {l.label}
                </span>
                <span className="block text-[11px] text-white/45">{l.blurb}</span>
              </span>
              <ExternalLink className="h-3.5 w-3.5 shrink-0 text-white/35" />
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
