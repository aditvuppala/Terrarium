"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  DATA_QUALITY_LABELS,
  EMPTY_COURSES,
  LEASE_TYPE_LABELS,
  PRICE_BASIS_LABELS,
  PRIORITY_LABELS,
  formatListingBeds,
  formatListingPrice,
  formatNullableRange,
} from "@/components/shared/constants";
import {
  ROUTE_COLORS,
  ROUTE_KINDS,
  buildHouseRoutes,
  formatMin,
  type RouteKind,
  type RouteTarget,
} from "@/components/map/houseRoutes";
import { GOLD, TOP_TIER, rankColor } from "@/components/map/rankColors";
import { useListingEnrichment } from "@/components/map/useListingEnrichment";
import { useTheme } from "@/components/map/useTheme";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  ExternalLinkIcon,
  StatusMetIcon,
  StatusPartialIcon,
  StatusUnknownIcon,
  StatusUnmetIcon,
  WarningIcon,
} from "@/components/ui/Icons";
import { landlordQuestions } from "@/lib/landlordQuestions";
import { monthlyCost } from "@/lib/rank";
import type { CriterionResult, Listing } from "@/lib/schemas";
import { useTerrarium } from "@/lib/store";

function PhotoCarousel({
  photos,
  listingName,
}: {
  photos: Listing["photos"];
  listingName: string;
}) {
  const [index, setIndex] = useState(0);
  if (photos.length === 0) return null;
  const safeIdx = index % photos.length;
  const current = photos[safeIdx];

  return (
    <figure className="space-y-1">
      <div className="relative h-36 w-full overflow-hidden rounded-xl border border-[#C8D3C1] bg-[#E6ECE1]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={current.url}
          alt={`${listingName}, photo ${safeIdx + 1} of ${photos.length}`}
          className="h-full w-full object-cover"
        />
        {photos.length > 1 && (
          <>
            <button
              type="button"
              aria-label="Previous photo"
              onClick={() => setIndex((i) => (i - 1 + photos.length) % photos.length)}
              className="absolute left-2 top-1/2 inline-flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-[#C8D3C1] bg-[#FCFDFB] text-[#16241B] shadow hover:bg-[#E6ECE1]"
            >
              <ChevronLeftIcon size={16} />
            </button>
            <button
              type="button"
              aria-label="Next photo"
              onClick={() => setIndex((i) => (i + 1) % photos.length)}
              className="absolute right-2 top-1/2 inline-flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-[#C8D3C1] bg-[#FCFDFB] text-[#16241B] shadow hover:bg-[#E6ECE1]"
            >
              <ChevronRightIcon size={16} />
            </button>
            <span className="absolute bottom-2 right-2 rounded-full bg-black/70 px-2 py-0.5 text-[11px] font-semibold text-white">
              {safeIdx + 1} / {photos.length}
            </span>
          </>
        )}
      </div>
      <figcaption className="text-[11px] text-[#3D5245]">
        Photo: {current.credit ?? "credit not listed"}
      </figcaption>
    </figure>
  );
}

const usd = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`;

function CriterionStatusIcon({ status }: { status: CriterionResult["status"] }) {
  switch (status) {
    case "met":
      return <StatusMetIcon size={16} className="shrink-0" />;
    case "partial":
      return <StatusPartialIcon size={16} className="shrink-0" />;
    case "unmet":
      return <StatusUnmetIcon size={16} className="shrink-0" />;
    case "unknown":
      return <StatusUnknownIcon size={16} className="shrink-0" />;
  }
}

const GROUP_TITLES: Record<RouteKind, string> = {
  classes: "Classes",
  buses: "Nearest bus stops",
  food: "Food nearby",
};

function RouteRow({ target }: { target: RouteTarget }) {
  return (
    <li className="flex items-start justify-between gap-3 py-1.5 text-xs">
      <div className="min-w-0">
        <div className="truncate font-semibold text-[#16241B]">
          {target.kind === "classes" && target.courses.length > 0
            ? `${target.detail} (${target.label})`
            : target.detail}
        </div>
        {target.courses.length > 0 && (
          <div className="text-[#3D5245]">
            {target.courses.join(", ")}
            {target.approximate && (
              <span className="ml-1.5 rounded bg-[#FBF1E8] px-1.5 py-0.5 text-[10px] font-semibold text-[#7A3415]">
                please confirm
              </span>
            )}
          </div>
        )}
        {target.routes.length > 0 && (
          <div className="text-[#3D5245]">{target.routes.join(" · ")}</div>
        )}
      </div>
      <div className="shrink-0 text-right tabular-nums">
        <div className="font-semibold text-[#16241B]">~{formatMin(target.walkMin)}</div>
        <div className="text-[10.5px] text-[#3D5245]">
          {target.busMin !== null ? `bus ~${formatMin(target.busMin)}` : "walk"}
        </div>
      </div>
    </li>
  );
}

/** House view details panel: sits beside the map (below it on phones), never over it. */
export default function ListingCard() {
  const selectedId = useTerrarium((s) => s.selectedListingId);
  const results = useTerrarium((s) => s.rankResponse?.results);
  const courses = useTerrarium((s) => s.profile.courses ?? EMPTY_COURSES);
  const majorCampus = useTerrarium((s) => s.profile.majorCampus);
  const profile = useTerrarium((s) => s.profile);
  const [copied, setCopied] = useState<string | null>(null);
  const { enrichment, error } = useListingEnrichment(selectedId);
  const theme = useTheme();

  const index = useMemo(
    () => (results && selectedId ? results.findIndex((r) => r.listing.id === selectedId) : -1),
    [results, selectedId],
  );
  const scored = results && index >= 0 ? results[index] : null;
  const total = results?.length ?? 0;

  const routes = useMemo(
    () => (scored ? buildHouseRoutes(scored.listing, enrichment, courses, majorCampus) : null),
    [scored, enrichment, courses, majorCampus],
  );

  const cost = useMemo(() => (scored ? monthlyCost(scored.listing, profile) : null), [scored, profile]);
  const questions = useMemo(
    () => (scored ? landlordQuestions(scored.listing, enrichment, profile) : []),
    [scored, enrichment, profile],
  );

  const orderedCriteria = useMemo(
    () => (scored ? [...scored.criteria].sort((a, b) => a.rank - b.rank) : []),
    [scored],
  );

  // Move focus to the listing name whenever a new house opens, unless the user is
  // driving the on-screen prev/next buttons (keep focus there so they can keep clicking).
  const headingRef = useRef<HTMLHeadingElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!selectedId) return;
    scrollRef.current?.scrollTo({ top: 0 });
    const active = document.activeElement;
    if (active instanceof HTMLElement && active.closest("[data-house-nav]")) return;
    headingRef.current?.focus({ preventScroll: true });
    // Phones: the map sits above this panel, so bring it (and the house nav) into view.
    if (window.innerWidth < 1000) {
      document.querySelector("[data-explore-map]")?.scrollIntoView({ block: "start" });
    }
  }, [selectedId]);

  if (!scored || !routes) return null;

  const { listing, score, rank, headline, shortfalls, passesDealbreakers } = scored;
  const isMock = listing.provenance.isSynthetic;
  const color = rankColor(index, total);
  const colors = ROUTE_COLORS[theme];
  const loading = !enrichment && !error;
  const perPerson = listing.priceBasis === "per_bed" || listing.priceBasis === "per_room";
  const splitWays = perPerson ? 1 : Math.max(1, Math.min((profile.roommates ?? 0) + 1, listing.bedsMax));

  return (
    <article
      aria-labelledby="house-title"
      className="flex h-full min-h-0 flex-col bg-[#FCFDFB] text-[#16241B]"
    >
      <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto px-4 pb-5 pt-4">
        {/* Identity */}
        <header>
          <div className="flex flex-wrap items-center gap-1.5">
            <span
              className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold text-white"
              style={{
                background: color,
                boxShadow: rank <= TOP_TIER ? `0 0 0 1.5px #fff, 0 0 0 3px ${GOLD}` : undefined,
              }}
            >
              #{rank} of {total} · Score {Math.round(score)}
            </span>
            <span
              className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                isMock
                  ? "border border-dashed border-[#3D5245] text-[#3D5245]"
                  : "border border-[#C8D3C1] bg-[#DFEAE2] text-[#1C452C]"
              }`}
            >
              {isMock ? "Mock listing" : "Real listing"}
            </span>
            {!passesDealbreakers && (
              <span className="rounded-full bg-[#FBECEB] px-2.5 py-1 text-[11px] font-semibold text-[#84231F]">
                Misses a dealbreaker
              </span>
            )}
          </div>
          <h2
            id="house-title"
            ref={headingRef}
            tabIndex={-1}
            className="mt-2.5 font-heading text-xl font-bold leading-snug text-[#16241B] outline-none"
          >
            {listing.name}
          </h2>
          <p className="text-sm text-[#3D5245]">{listing.address}</p>
          <div className="mt-2 flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <span className="font-heading text-2xl font-bold text-[#16241B]">
              {formatListingPrice(listing)}
            </span>
            <span className="text-xs text-[#3D5245]">{PRICE_BASIS_LABELS[listing.priceBasis]}</span>
          </div>
          <p className="mt-1 text-xs text-[#3D5245]">
            {formatListingBeds(listing)} · {formatNullableRange(listing.bathsMin, listing.bathsMax, "bath")} ·{" "}
            {LEASE_TYPE_LABELS[listing.leaseType]}
          </p>
        </header>

        {listing.scam.level === "medium" && (
          <div
            role="alert"
            className="rounded-xl border border-[#DFB391] bg-[#FBF1E8] p-3 text-xs text-[#7A3415]"
          >
            <div className="flex items-center gap-2 font-bold">
              <WarningIcon size={16} className="shrink-0" />
              <span>Caution: some scam-risk signals</span>
            </div>
            {listing.scam.reasons.length > 0 && (
              <ul className="mt-1.5 list-disc space-y-1 pl-5">
                {listing.scam.reasons.map((reason, i) => (
                  <li key={i}>{reason}</li>
                ))}
              </ul>
            )}
          </div>
        )}

        <p className="rounded-xl border border-[#C8D3C1] bg-[#F3F5EF] p-3 text-sm font-medium leading-relaxed text-[#16241B]">
          {headline}
        </p>

        {/* Priorities */}
        <section aria-labelledby="house-priorities">
          <h3
            id="house-priorities"
            className="text-[11px] font-bold uppercase tracking-wider text-[#3D5245]"
          >
            Your priorities
          </h3>
          <ul className="mt-1.5 divide-y divide-[#E6ECE1]">
            {orderedCriteria.map((c) => (
              <li key={c.key} className="flex items-start gap-2 py-2">
                <span className="mt-0.5">
                  <CriterionStatusIcon status={c.status} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold text-[#16241B]">{PRIORITY_LABELS[c.key]}</span>
                    <span className="text-[10.5px] text-[#3D5245]">{DATA_QUALITY_LABELS[c.dataQuality]}</span>
                  </div>
                  <p className="text-xs leading-relaxed text-[#3D5245]">{c.detail}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>

        {/* Shortfalls are never hidden */}
        {shortfalls.length > 0 ? (
          <section
            aria-labelledby="house-shortfalls"
            className="rounded-xl border border-[#DFB391] bg-[#FBF1E8] p-3"
          >
            <h3 id="house-shortfalls" className="text-sm font-bold text-[#7A3415]">
              Doesn&apos;t fully fit
            </h3>
            <ul className="mt-1.5 list-disc space-y-1 pl-5 text-xs leading-relaxed text-[#7A3415]">
              {shortfalls.map((sf, idx) => (
                <li key={idx}>{sf}</li>
              ))}
            </ul>
          </section>
        ) : (
          <section
            aria-labelledby="house-shortfalls"
            className="rounded-xl border border-[#C8D3C1] bg-[#DFEAE2] p-3"
          >
            <h3 id="house-shortfalls" className="text-sm font-bold text-[#1C452C]">
              Fits everything you&apos;ve told us
            </h3>
            <p className="mt-1 text-xs text-[#1C452C]">
              Every priority is fully met. Add more priorities to compare more closely.
            </p>
          </section>
        )}

        {cost && (
          <section aria-labelledby="house-cost" className="rounded-xl border border-[#C8D3C1] bg-[#F3F5EF] p-3">
            <h3 id="house-cost" className="text-[11px] font-bold uppercase tracking-wider text-[#3D5245]">
              True monthly cost (estimate)
            </h3>
            <dl className="mt-1.5 space-y-1 text-xs tabular-nums">
              <div className="flex justify-between gap-3">
                <dt className="text-[#3D5245]">
                  Your rent share
                  {splitWays > 1 ? ` (split ${splitWays} ways)` : ""}
                  {cost.assumedPerUnit ? " · assumes per-unit price" : ""}
                </dt>
                <dd className="font-semibold text-[#16241B]">{usd(cost.share)}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-[#3D5245]">+ Utilities (estimate)</dt>
                <dd className="font-semibold text-[#16241B]">{usd(cost.utilities)}</dd>
              </div>
              {cost.parking > 0 && (
                <div className="flex justify-between gap-3">
                  <dt className="text-[#3D5245]">+ Parking (estimate)</dt>
                  <dd className="font-semibold text-[#16241B]">{usd(cost.parking)}</dd>
                </div>
              )}
              <div className="flex justify-between gap-3 border-t border-[#C8D3C1] pt-1">
                <dt className="font-bold text-[#16241B]">= Estimated monthly total</dt>
                <dd className="font-bold text-[#16241B]">{usd(cost.monthly)}</dd>
              </div>
            </dl>
          </section>
        )}

        {questions.length > 0 && (
          <section aria-labelledby="house-questions">
            <div className="flex items-center justify-between gap-2">
              <h3 id="house-questions" className="text-[11px] font-bold uppercase tracking-wider text-[#3D5245]">
                Questions to ask the landlord
              </h3>
              <button
                type="button"
                onClick={() => {
                  const text = questions.map((q) => `- ${q.question}`).join("\n");
                  navigator.clipboard?.writeText(text).then(
                    () => setCopied(listing.id),
                    () => setCopied(null),
                  );
                }}
                className="min-h-[32px] rounded-lg border border-[#C8D3C1] bg-[#FCFDFB] px-2.5 text-[11px] font-semibold text-[#16241B] hover:bg-[#E6ECE1]"
              >
                {copied === listing.id ? "Copied" : "Copy questions"}
              </button>
            </div>
            <ol className="mt-1.5 list-decimal space-y-1.5 pl-5 text-xs">
              {questions.map((q) => (
                <li key={q.id}>
                  <span className="font-semibold text-[#16241B]">{q.question}</span>
                  <span className="block text-[11px] text-[#3D5245]">{q.why}</span>
                </li>
              ))}
            </ol>
          </section>
        )}

        {/* Routes, matching the map's colored lines */}
        <section aria-labelledby="house-routes">
          <h3
            id="house-routes"
            className="text-[11px] font-bold uppercase tracking-wider text-[#3D5245]"
          >
            Getting around · estimated walk
          </h3>
          {error && <p className="mt-1.5 text-xs text-[#84231F]">{error}</p>}
          <div className="mt-1.5 space-y-3">
            {ROUTE_KINDS.map((k) => {
              const items = routes[k];
              const title =
                k === "classes" && routes.classBasis === "campus"
                  ? "Campus (add classes for exact buildings)"
                  : GROUP_TITLES[k];
              return (
                <div key={k}>
                  <div className="flex items-center gap-2 text-xs font-bold text-[#16241B]">
                    <span
                      aria-hidden="true"
                      className="inline-block h-[3px] w-4 rounded-full"
                      style={{ background: colors[k] }}
                    />
                    {title}
                  </div>
                  {items.length > 0 ? (
                    <ul className="divide-y divide-[#E6ECE1] pl-6">
                      {items.map((t) => (
                        <RouteRow key={t.id} target={t} />
                      ))}
                    </ul>
                  ) : (
                    <p className="pl-6 pt-1 text-xs text-[#3D5245]">
                      {loading
                        ? "Loading..."
                        : k === "buses"
                          ? "No bus stops within 800 m."
                          : "Nothing found within 1 km."}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
          <p className="mt-2.5 text-[11px] leading-relaxed text-[#3D5245]">
            Map lines are straight-line sketches, not street directions. Walk times are estimates
            (straight line × 1.3 at about 80 m per minute).
          </p>
        </section>

        <PhotoCarousel key={listing.id} photos={listing.photos} listingName={listing.name} />

        <footer className="border-t border-[#E6ECE1] pt-3 text-xs text-[#3D5245]">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span>Source: {listing.provenance.sourceName}</span>
            {listing.provenance.sourceUrl && (
              <a
                href={listing.provenance.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 font-semibold text-[#2F6B47] underline underline-offset-2 hover:text-[#245538]"
              >
                <span>Original listing</span>
                <ExternalLinkIcon size={12} />
              </a>
            )}
            <span>· Retrieved {listing.provenance.retrievedAt}</span>
          </div>
        </footer>
      </div>
    </article>
  );
}
