"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeftIcon, ChevronRightIcon, CloseIcon } from "@/components/ui/Icons";
import AnnArborMap from "@/components/onboarding/major/AnnArborMap";
import {
  GROUPS,
  MAJORS,
  ZONE_LABELS,
  groupForMajor,
  searchGroups,
  type MajorGroup,
} from "@/components/onboarding/major/zones";
import type { Campus } from "@/lib/schemas";

export interface MajorStepProps {
  /** Previously saved major, if any. */
  initialMajor: { name: string; campus: Campus | null } | null;
  /** Save the major (campus null = unknown, chat will ask) and go to /explore. */
  onFinish: (majorName: string, campus: Campus | null) => void;
  onBack: () => void;
}

const PANEL_ID = "major-group-panel";

function groupNumber(g: MajorGroup): number {
  return GROUPS.indexOf(g) + 1;
}

/** Numbered badge shared by the results list, legend and panel (fixed colors, readable in both themes). */
function Badge({ n, size = "sm" }: { n: number; size?: "sm" | "lg" }) {
  return (
    <span
      aria-hidden="true"
      className={`grid shrink-0 place-items-center rounded-full bg-[#B65A3C] font-serif font-bold italic text-[#FBF3EA] ${
        size === "lg" ? "h-8 w-8 text-sm" : "h-5 w-5 text-[11px]"
      }`}
    >
      {n}
    </span>
  );
}

const focusRing =
  "focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#2F6B47]";

/** Onboarding step 2: "What's your major?" picked on an illustrated Ann Arbor map. */
export default function MajorStep({ initialMajor, onFinish, onBack }: MajorStepProps) {
  const [query, setQuery] = useState<string>("");
  const [openId, setOpenId] = useState<string | null>(null);
  const [hoverId, setHoverId] = useState<string | null>(null);
  const panelRef = useRef<HTMLElement>(null);
  const focusPanelNext = useRef(false);

  const trimmedQuery = query.trim();
  const results = useMemo(() => searchGroups(trimmedQuery), [trimmedQuery]);
  const matchIds = useMemo(
    () => (trimmedQuery ? new Set(results.map((r) => r.group.id)) : null),
    [trimmedQuery, results],
  );
  const matchCount = results.reduce((n, r) => n + r.majors.length, 0);
  const exactMatch = useMemo(
    () => MAJORS.find((m) => m.name.toLowerCase() === trimmedQuery.toLowerCase()) ?? null,
    [trimmedQuery],
  );

  const currentGroup = initialMajor ? groupForMajor(initialMajor.name) : undefined;
  const openGroup = GROUPS.find((g) => g.id === openId) ?? null;

  // Move focus into the panel after the user opens a group (and bring it into view on phones).
  useEffect(() => {
    if (!openGroup || !focusPanelNext.current) return;
    focusPanelNext.current = false;
    const el = panelRef.current;
    if (!el) return;
    el.focus({ preventScroll: true });
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "nearest" });
  }, [openGroup]);

  const toggleGroup = (id: string) => {
    if (openId === id) {
      setOpenId(null);
      return;
    }
    focusPanelNext.current = true;
    setOpenId(id);
  };

  const closePanel = () => {
    const id = openId;
    setOpenId(null);
    if (id) document.querySelector<HTMLButtonElement>(`button[data-group="${id}"]`)?.focus();
  };

  const submitQuery = () => {
    if (!trimmedQuery) return;
    if (exactMatch) onFinish(exactMatch.name, exactMatch.campus);
    else if (matchCount === 1) {
      const sole = results[0].majors[0];
      onFinish(sole.name, sole.campus);
    } else onFinish(trimmedQuery, null);
  };

  const q = trimmedQuery.toLowerCase();

  return (
    <div>
      <h1 className="font-heading text-2xl font-bold text-[#16241B] sm:text-3xl">
        What&apos;s your major?
      </h1>
      <p className="mt-2 text-sm text-[#3D5245]">
        Pick your school on the map. We use it to anchor your first commute estimate before you
        add specific classes.
      </p>

      <div className="mt-6 grid gap-5 lg:grid-cols-[minmax(0,1fr)_272px] lg:grid-rows-[auto_1fr] lg:items-start">
        {/* Search (right column on desktop, top on phones) */}
        <div className="lg:col-start-2 lg:row-start-1">
          <label htmlFor="major-filter-input" className="block text-sm font-semibold text-[#16241B]">
            Search or type your major
          </label>
          <input
            id="major-filter-input"
            type="search"
            value={query}
            autoComplete="off"
            placeholder="e.g. Nursing, Economics..."
            aria-describedby="major-search-status"
            onChange={(e) => {
              setQuery(e.target.value);
              setOpenId(null);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                submitQuery();
              } else if (e.key === "Escape" && query) {
                e.preventDefault();
                setQuery("");
              }
            }}
            className="mt-2 min-h-[48px] w-full rounded-xl border-2 border-[#C8D3C1] bg-[#F3F5EF] px-4 py-2.5 text-base text-[#16241B] placeholder:text-[#3D5245]/70 focus:border-[#2F6B47] focus:bg-[#FCFDFB] focus:outline-none"
          />
          <p id="major-search-status" aria-live="polite" className="mt-1.5 min-h-[1.25rem] text-xs text-[#3D5245]">
            {trimmedQuery
              ? matchCount > 0
                ? `${matchCount} match${matchCount === 1 ? "" : "es"}, highlighted on the map.`
                : "No preset major matched. You can still use what you typed."
              : "Or tap a building on the map."}
          </p>

          {trimmedQuery && !openGroup && (
            <div className="mt-2 max-h-72 overflow-y-auto rounded-xl border border-[#C8D3C1] bg-[#FCFDFB] p-2 shadow-sm lg:max-h-[22rem]">
              {results.map(({ group, majors }) => (
                <div key={group.id} className="mb-1.5 last:mb-0">
                  <div
                    className="flex items-center gap-2 px-2 py-1.5 text-xs font-bold uppercase tracking-wider text-[#2F6B47]"
                    onMouseEnter={() => setHoverId(group.id)}
                    onMouseLeave={() => setHoverId(null)}
                  >
                    <Badge n={groupNumber(group)} />
                    <span>{group.label}</span>
                  </div>
                  <ul>
                    {majors.map((m) => (
                      <li key={m.name}>
                        <button
                          type="button"
                          onClick={() => onFinish(m.name, m.campus)}
                          onMouseEnter={() => setHoverId(group.id)}
                          onMouseLeave={() => setHoverId(null)}
                          onFocus={() => setHoverId(group.id)}
                          onBlur={() => setHoverId(null)}
                          className={`flex min-h-[44px] w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium text-[#16241B] hover:bg-[#E6ECE1] ${focusRing}`}
                        >
                          <span>{m.name}</span>
                          <ChevronRightIcon size={16} className="shrink-0 text-[#3D5245]" />
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}

              {!exactMatch && (
                <div className={results.length > 0 ? "mt-1.5 border-t border-[#E6ECE1] pt-2" : ""}>
                  <button
                    type="button"
                    onClick={() => onFinish(trimmedQuery, null)}
                    className={`flex min-h-[44px] w-full items-center justify-between gap-2 rounded-lg bg-[#F3F5EF] px-3 py-2 text-left text-sm font-semibold text-[#16241B] hover:bg-[#DFEAE2] ${focusRing}`}
                  >
                    <span className="min-w-0 break-words">Use &lsquo;{trimmedQuery}&rsquo;</span>
                    <span className="shrink-0 text-xs font-normal text-[#3D5245]">We&apos;ll ask campus later</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Map */}
        <div className="lg:col-start-1 lg:row-span-2 lg:row-start-1">
          <AnnArborMap
            groups={GROUPS}
            panelId={PANEL_ID}
            openId={openId}
            hoverId={hoverId}
            matchIds={matchIds}
            currentId={currentGroup?.id ?? null}
            onToggle={toggleGroup}
            onHover={setHoverId}
          />

          {/* Phone legend: names for the numbered buildings */}
          <ul className="mt-3 grid grid-cols-1 gap-1.5 sm:hidden" aria-label="Schools on the map">
            {GROUPS.map((g, i) => {
              const isOpen = g.id === openId;
              const isMatch = matchIds?.has(g.id) ?? false;
              const isDim = matchIds !== null && !isMatch && !isOpen;
              return (
                <li key={g.id}>
                  <button
                    type="button"
                    aria-expanded={isOpen}
                    aria-controls={PANEL_ID}
                    onClick={() => toggleGroup(g.id)}
                    className={`flex min-h-[44px] w-full items-center gap-2.5 rounded-xl border-2 px-3 py-1.5 text-left text-sm font-semibold text-[#16241B] transition-opacity ${focusRing} ${
                      isOpen
                        ? "border-[#2F6B47] bg-[#DFEAE2]"
                        : isMatch
                          ? "border-[#E0A928] bg-[#FCFDFB]"
                          : "border-[#C8D3C1] bg-[#FCFDFB]"
                    } ${isDim ? "opacity-50" : ""}`}
                  >
                    <Badge n={i + 1} />
                    <span className="min-w-0 flex-1">{g.label}</span>
                    <span className="shrink-0 text-xs font-medium text-[#3D5245]">
                      {ZONE_LABELS[g.zone]}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>

        {/* Group panel (right column on desktop, under the map on phones) */}
        <div className="lg:col-start-2 lg:row-start-2">
          {openGroup ? (
            <section
              id={PANEL_ID}
              ref={panelRef}
              tabIndex={-1}
              aria-labelledby="major-group-title"
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  e.stopPropagation();
                  closePanel();
                }
              }}
              className="rounded-2xl border border-[#C8D3C1] bg-[#F3F5EF] p-4 shadow-[0_10px_30px_-20px_rgba(29,57,53,0.6)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2F6B47]"
            >
              <div className="flex items-start gap-3">
                <Badge n={groupNumber(openGroup)} size="lg" />
                <div className="min-w-0 flex-1">
                  {ZONE_LABELS[openGroup.zone] !== openGroup.title && (
                    <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#2F6B47]">
                      {ZONE_LABELS[openGroup.zone]}
                    </p>
                  )}
                  <h2 id="major-group-title" className="font-heading text-lg font-bold leading-tight text-[#16241B]">
                    {openGroup.title}
                  </h2>
                  <p className="mt-1 font-serif text-[13px] italic text-[#3D5245]">{openGroup.blurb}</p>
                </div>
                <button
                  type="button"
                  onClick={closePanel}
                  aria-label="Close"
                  className={`-mr-1 -mt-1 grid h-10 w-10 shrink-0 place-items-center rounded-lg text-[#3D5245] hover:bg-[#E6ECE1] ${focusRing}`}
                >
                  <CloseIcon size={18} />
                </button>
              </div>

              <div className="-mx-1 mt-3 space-y-3 px-1 py-0.5 lg:max-h-[19rem] lg:overflow-y-auto">
                {openGroup.sections.map((s) => (
                  <div key={s.school}>
                    {openGroup.sections.length > 1 && (
                      <h3 className="mb-1.5 text-xs font-bold uppercase tracking-wider text-[#3D5245]">
                        {s.school}
                      </h3>
                    )}
                    <ul className="space-y-1.5">
                      {s.majors.map((m) => {
                        const isMatch = q.length > 0 && m.name.toLowerCase().includes(q);
                        const isCurrent = initialMajor?.name === m.name;
                        return (
                          <li key={m.name}>
                            <button
                              type="button"
                              onClick={() => onFinish(m.name, m.campus)}
                              className={`flex min-h-[44px] w-full items-center justify-between gap-2 rounded-xl border px-3 py-1.5 text-left text-sm font-medium text-[#16241B] transition-colors hover:border-[#2F6B47] hover:bg-[#DFEAE2] ${focusRing} ${
                                isMatch ? "border-[#2F6B47] bg-[#DFEAE2]" : "border-[#C8D3C1] bg-[#FCFDFB]"
                              }`}
                            >
                              <span>{m.name}</span>
                              <span className="flex shrink-0 items-center gap-1.5">
                                {isCurrent && (
                                  <span className="rounded-full bg-[#DFEAE2] px-2 py-0.5 text-[11px] font-semibold text-[#2F6B47]">
                                    Current
                                  </span>
                                )}
                                <ChevronRightIcon size={16} className="text-[#3D5245]" />
                              </span>
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                ))}
              </div>
            </section>
          ) : trimmedQuery ? null : (
            <div
              id={PANEL_ID}
              className="hidden rounded-2xl border border-dashed border-[#C8D3C1] bg-[#F3F5EF] p-4 text-sm text-[#3D5245] lg:block"
            >
              <p className="font-serif italic text-[#16241B]">Every school has a building.</p>
              <p className="mt-1">
                Choose one to see its majors. Engineering, music and art live north of the river;
                LSA, Ross and the policy and information schools are on Central.
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="mt-7 flex flex-wrap items-center justify-between gap-3 border-t border-[#E6ECE1] pt-5">
        <button
          type="button"
          onClick={onBack}
          className={`inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border border-[#C8D3C1] bg-[#F3F5EF] px-4 py-2 text-sm font-semibold text-[#16241B] hover:bg-[#E6ECE1] ${focusRing}`}
        >
          <ChevronLeftIcon size={18} />
          <span>Back</span>
        </button>

        {initialMajor && (
          <button
            type="button"
            onClick={() => onFinish(initialMajor.name, initialMajor.campus)}
            className={`inline-flex min-h-[44px] max-w-full items-center gap-2 rounded-xl bg-[#2F6B47] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#245538] ${focusRing}`}
          >
            <span className="truncate">Keep {initialMajor.name}</span>
            <ChevronRightIcon size={18} />
          </button>
        )}
      </div>
    </div>
  );
}
