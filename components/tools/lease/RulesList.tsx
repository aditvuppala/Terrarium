import { ExternalLinkIcon } from "@/components/ui/Icons";
import { LEASE_RULES } from "@/lib/lease/rules";

const GROUPS = [
  { key: "michigan", label: "Michigan law" },
  { key: "ann_arbor", label: "Ann Arbor ordinances" },
] as const;

/** The fixed list of rules the reviewer can flag, with links to the official text. */
export default function RulesList() {
  return (
    <section className="rounded-2xl border border-[#C8D3C1] bg-[#FCFDFB] p-5 sm:p-6">
      <h2 className="font-heading text-xl font-bold text-[#16241B]">What we check</h2>
      <p className="mt-1 text-sm leading-relaxed text-[#3D5245]">
        A fixed list of rules, each checked against the official text. We only flag a clause we can quote word for word from your lease.
      </p>
      {GROUPS.map((g) => (
        <details key={g.key} className="group mt-3 rounded-xl border border-[#C8D3C1]" open={g.key === "ann_arbor"}>
          <summary className="flex min-h-[44px] cursor-pointer list-none items-center justify-between px-3 text-sm font-semibold text-[#16241B] [&::-webkit-details-marker]:hidden">
            {g.label}
            <span className="text-[#3D5245] transition-transform group-open:rotate-90" aria-hidden="true">
              ›
            </span>
          </summary>
          <ul className="space-y-2 border-t border-[#C8D3C1] px-3 py-3">
            {LEASE_RULES.filter((r) => r.jurisdiction === g.key).map((r) => (
              <li key={r.id} className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 text-sm">
                <span className="text-[#16241B]">{r.title}</span>
                <a
                  href={r.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-0.5 whitespace-nowrap text-xs font-semibold text-[#2F6B47] underline underline-offset-2"
                >
                  {r.citation}
                  <ExternalLinkIcon size={11} />
                </a>
              </li>
            ))}
          </ul>
        </details>
      ))}
    </section>
  );
}
