"use client";

import { useEffect, useMemo, useState } from "react";
import {
  BUILDINGS_BY_CODE,
  DATA_QUALITY_LABELS,
  EMPTY_CATEGORIES,
  EMPTY_COURSES,
  LEASE_TYPE_LABELS,
  PLACE_CATEGORY_LABELS,
  PRICE_BASIS_LABELS,
  PRIORITY_LABELS,
  formatListingBeds,
  formatListingPrice,
  formatNullableRange,
} from "@/components/shared/constants";
import {
  BuildingIcon,
  BusIcon,
  ChatBubbleIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CloseIcon,
  ExternalLinkIcon,
  StatusMetIcon,
  StatusPartialIcon,
  StatusUnknownIcon,
  StatusUnmetIcon,
  WarningIcon,
} from "@/components/ui/Icons";
import { ListingDetailResponse, type CriterionResult, type Listing } from "@/lib/schemas";
import { useTerrarium } from "@/lib/store";

function PhotoCarousel({ photos, listingName, isSynthetic }: {
  photos: Listing["photos"];
  listingName: string;
  isSynthetic: boolean;
}) {
  const [index, setIndex] = useState(0);

  if (photos.length === 0) {
    return (
      <div className="flex h-40 w-full flex-col items-center justify-center rounded-xl border border-[#C8D3C1] bg-[#E6ECE1] px-4 text-center">
        <p className="text-sm font-semibold text-[#16241B]">No photos stored</p>
        <p className="mt-1 text-xs text-[#3D5245]">
          {isSynthetic
            ? "Synthetic listing without attached placeholder photos."
            : "Photos remain on the original U-M Off-Campus Housing page per site terms."}
        </p>
      </div>
    );
  }

  const safeIdx = index % photos.length;
  const current = photos[safeIdx];

  return (
    <div className="space-y-1.5">
      <div className="relative h-48 w-full overflow-hidden rounded-xl border border-[#C8D3C1] bg-[#E6ECE1]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={current.url}
          alt={`${listingName} — photo ${safeIdx + 1} of ${photos.length}`}
          className="h-full w-full object-cover"
        />

        {photos.length > 1 && (
          <>
            <button
              type="button"
              aria-label="Previous photo"
              onClick={() => setIndex((i) => (i - 1 + photos.length) % photos.length)}
              className="absolute left-2 top-1/2 inline-flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-[#C8D3C1] bg-[#FCFDFB]/95 text-[#16241B] shadow hover:bg-[#FCFDFB]"
            >
              <ChevronLeftIcon size={18} />
            </button>
            <button
              type="button"
              aria-label="Next photo"
              onClick={() => setIndex((i) => (i + 1) % photos.length)}
              className="absolute right-2 top-1/2 inline-flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-[#C8D3C1] bg-[#FCFDFB]/95 text-[#16241B] shadow hover:bg-[#FCFDFB]"
            >
              <ChevronRightIcon size={18} />
            </button>
            <span className="absolute bottom-2 right-2 rounded-full bg-[#16241B]/85 px-2.5 py-0.5 text-xs font-semibold text-[#F3F5EF]">
              {safeIdx + 1} / {photos.length}
            </span>
          </>
        )}
      </div>

      <p className="text-[11px] text-[#3D5245]">
        Photo credit:{" "}
        {current.credit ?? (isSynthetic ? "Synthetic placeholder (Terrarium)" : "Not listed")}
      </p>
    </div>
  );
}

function CriterionStatusIcon({ status }: { status: CriterionResult["status"] }) {
  switch (status) {
    case "met":
      return <StatusMetIcon size={18} className="shrink-0" />;
    case "partial":
      return <StatusPartialIcon size={18} className="shrink-0" />;
    case "unmet":
      return <StatusUnmetIcon size={18} className="shrink-0" />;
    case "unknown":
      return <StatusUnknownIcon size={18} className="shrink-0" />;
  }
}

export default function ListingCard() {
  const selectedId = useTerrarium((s) => s.selectedListingId);
  const scored = useTerrarium((s) =>
    s.rankResponse?.results.find((r) => r.listing.id === selectedId) ?? null,
  );
  const cachedEnrichment = useTerrarium((s) =>
    selectedId ? s.enrichmentById[selectedId] ?? null : null,
  );
  const cacheEnrichment = useTerrarium((s) => s.cacheEnrichment);
  const close = useTerrarium((s) => s.setSelectedListingId);
  const courses = useTerrarium((s) => s.profile.courses ?? EMPTY_COURSES);
  const placeCategories = useTerrarium((s) => s.profile.placeCategories ?? EMPTY_CATEGORIES);
  const askChatAboutPlaceCategories = useTerrarium((s) => s.askChatAboutPlaceCategories);

  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedId || cachedEnrichment) return;
    const controller = new AbortController();
    fetch(`/api/listings/${encodeURIComponent(selectedId)}`, {
      signal: controller.signal,
    })
      .then((res) => {
        if (!res.ok) throw new Error(`Could not load listing details (${res.status})`);
        return res.json();
      })
      .then((json) => {
        const parsed = ListingDetailResponse.parse(json);
        if (!controller.signal.aborted) {
          setFetchError(null);
          cacheEnrichment(selectedId, parsed.enrichment);
        }
      })
      .catch((err) => {
        if (!controller.signal.aborted) {
          setFetchError(err instanceof Error ? err.message : "Failed to load enrichment");
        }
      });
    return () => controller.abort();
  }, [selectedId, cachedEnrichment, cacheEnrichment]);

  const orderedCriteria = useMemo(
    () => (scored ? [...scored.criteria].sort((a, b) => a.rank - b.rank) : []),
    [scored],
  );

  const courseBuildingTimes = useMemo(() => {
    if (!cachedEnrichment || courses.length === 0) return [];
    const btByCode = new Map(
      cachedEnrichment.buildingTimes.map((bt) => [bt.buildingCode, bt]),
    );
    return courses.map((course) => {
      const bldg = course.buildingCode ? BUILDINGS_BY_CODE.get(course.buildingCode) ?? null : null;
      const bt = course.buildingCode ? btByCode.get(course.buildingCode) ?? null : null;
      return { course, building: bldg, bt };
    });
  }, [cachedEnrichment, courses]);

  const groupedNearbyPlaces = useMemo(() => {
    if (!cachedEnrichment || placeCategories.length === 0) return [];
    return placeCategories.map((cat) => {
      const matches = cachedEnrichment.places
        .filter((p) => p.category === cat)
        .sort((a, b) => a.walkMin - b.walkMin);
      return { category: cat, label: PLACE_CATEGORY_LABELS[cat], places: matches };
    });
  }, [cachedEnrichment, placeCategories]);

  if (!selectedId || !scored) return null;

  const { listing, score, rank, headline, shortfalls, passesDealbreakers } = scored;
  const isMock = listing.provenance.isSynthetic;
  const isLoadingEnrichment = !cachedEnrichment && !fetchError;

  return (
    <aside
      aria-label={`Details for ${listing.name}`}
      className="absolute bottom-3 right-3 top-3 z-[1000] flex w-[calc(100%-1.5rem)] max-w-[430px] flex-col overflow-hidden rounded-2xl border border-[#C8D3C1] bg-[#FCFDFB] text-[#16241B] shadow-xl"
    >
      {/* Sticky Top Bar */}
      <div className="flex items-center justify-between gap-2 border-b border-[#E6ECE1] bg-[#FCFDFB] px-4 py-2.5">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-bold ${
              isMock
                ? "border border-dashed border-[#3D5245] bg-[#E6ECE1] text-[#16241B]"
                : "border border-[#2F6B47] bg-[#DFEAE2] text-[#1C452C]"
            }`}
          >
            {isMock ? "Mock listing" : "Real listing"}
          </span>

          <span className="rounded-full bg-[#2F6B47] px-2.5 py-1 text-xs font-bold text-white">
            Rank #{rank} · Score {Math.round(score)}
          </span>
        </div>

        <button
          type="button"
          aria-label="Close listing detail card"
          onClick={() => close(null)}
          className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[#C8D3C1] bg-[#F3F5EF] text-[#16241B] hover:bg-[#E6ECE1]"
        >
          <CloseIcon size={18} />
        </button>
      </div>

      {/* Scrollable Body */}
      <div className="flex-1 space-y-5 overflow-y-auto p-4 sm:p-5">
        {/* Photo Carousel (keyed by listing.id to reset slide index cleanly) */}
        <PhotoCarousel
          key={listing.id}
          photos={listing.photos}
          listingName={listing.name}
          isSynthetic={isMock}
        />

        {/* Name, Address, Price & Badges */}
        <div>
          <h2 className="font-heading text-xl font-bold leading-snug text-[#16241B]">
            {listing.name}
          </h2>
          <p className="mt-0.5 text-sm text-[#3D5245]">{listing.address}</p>

          <div className="mt-3 flex flex-wrap items-baseline gap-2">
            <span className="font-heading text-2xl font-bold text-[#16241B]">
              {formatListingPrice(listing)}
            </span>
            <span className="rounded-md bg-[#E6ECE1] px-2 py-0.5 text-xs font-medium text-[#3D5245]">
              {PRICE_BASIS_LABELS[listing.priceBasis]}
            </span>
          </div>

          {/* Structured Fact Badges */}
          <div className="mt-3 flex flex-wrap gap-1.5 text-xs">
            <span className="rounded-lg border border-[#C8D3C1] bg-[#F3F5EF] px-2.5 py-1 font-medium">
              {LEASE_TYPE_LABELS[listing.leaseType]}
            </span>
            <span className="rounded-lg border border-[#C8D3C1] bg-[#F3F5EF] px-2.5 py-1 font-medium">
              Beds: {formatListingBeds(listing)}
            </span>
            <span className="rounded-lg border border-[#C8D3C1] bg-[#F3F5EF] px-2.5 py-1 font-medium">
              Baths: {formatNullableRange(listing.bathsMin, listing.bathsMax, "bath")}
            </span>
            <span className="rounded-lg border border-[#C8D3C1] bg-[#F3F5EF] px-2.5 py-1 font-medium">
              Sq ft: {formatNullableRange(listing.sqftMin, listing.sqftMax, "sq ft")}
            </span>
            <span className="rounded-lg border border-[#C8D3C1] bg-[#F3F5EF] px-2.5 py-1 font-medium">
              Rent negotiable: {listing.rentNegotiable}
            </span>
          </div>

          {/* Scam Level "medium" Warning Badge + Reasons */}
          {listing.scam.level === "medium" && (
            <div
              role="alert"
              className="mt-3 rounded-xl border border-[#DFB391] bg-[#FBF1E8] p-3 text-xs text-[#7A3415]"
            >
              <div className="flex items-center gap-2 font-bold">
                <WarningIcon size={17} className="shrink-0" />
                <span>Caution: Medium scam-risk signals detected</span>
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
        </div>

        {/* Score + Rank + Headline */}
        <section className="rounded-xl border border-[#C8D3C1] bg-[#F3F5EF] p-3.5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-[#3D5245]">
              Why it ranks #{rank}
            </span>
            {!passesDealbreakers && (
              <span className="rounded-full bg-[#FBECEB] px-2.5 py-0.5 text-xs font-semibold text-[#84231F]">
                Misses dealbreaker
              </span>
            )}
          </div>
          <p className="mt-1.5 text-sm font-medium leading-relaxed text-[#16241B]">
            {headline}
          </p>
        </section>

        {/* Criteria List in Priority Order */}
        <section aria-label="How your priorities match">
          <h3 className="font-heading text-sm font-bold uppercase tracking-wider text-[#3D5245]">
            Priority breakdown
          </h3>
          <ul className="mt-2.5 space-y-2">
            {orderedCriteria.map((c) => (
              <li
                key={c.key}
                className="flex items-start gap-2.5 rounded-xl border border-[#E6ECE1] bg-[#F3F5EF]/65 p-3"
              >
                <div className="mt-0.5">
                  <CriterionStatusIcon status={c.status} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-sm font-semibold text-[#16241B]">
                      {PRIORITY_LABELS[c.key]}
                    </span>
                    <span className="rounded-full border border-[#C8D3C1] bg-[#FCFDFB] px-2 py-0.5 text-[11px] font-medium text-[#3D5245]">
                      {DATA_QUALITY_LABELS[c.dataQuality]}
                    </span>
                  </div>
                  <p className="mt-1 text-xs leading-relaxed text-[#3D5245]">{c.detail}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>

        {/* "Doesn't fully fit" Section — NEVER hide shortfalls */}
        <section
          aria-label="Doesn't fully fit"
          className="rounded-xl border border-[#DFB391] bg-[#FBF1E8] p-3.5"
        >
          <h3 className="font-heading text-sm font-bold text-[#7A3415]">
            Doesn&apos;t fully fit
          </h3>
          {shortfalls.length > 0 ? (
            <ul className="mt-2 list-disc space-y-1.5 pl-5 text-xs leading-relaxed text-[#7A3415]">
              {shortfalls.map((sf, idx) => (
                <li key={idx}>{sf}</li>
              ))}
            </ul>
          ) : (
            <p className="mt-1.5 text-xs text-[#7A3415]">
              Every active priority is fully met based on what you&apos;ve told us so far.
            </p>
          )}
        </section>

        {/* Getting Around: User's Course Buildings + Nearest Bus Stops */}
        <section aria-label="Getting around" className="space-y-3">
          <h3 className="font-heading text-sm font-bold uppercase tracking-wider text-[#3D5245]">
            Getting around
          </h3>

          {/* Course Buildings */}
          <div className="rounded-xl border border-[#E6ECE1] bg-[#F3F5EF] p-3">
            <div className="flex items-center gap-1.5 text-xs font-bold text-[#16241B]">
              <BuildingIcon size={15} className="text-[#2F6B47]" />
              <span>Your class buildings</span>
            </div>

            {isLoadingEnrichment ? (
              <p className="mt-2 text-xs text-[#3D5245]">Loading travel times...</p>
            ) : fetchError ? (
              <p className="mt-2 text-xs text-[#84231F]">{fetchError}</p>
            ) : courseBuildingTimes.length === 0 ? (
              <p className="mt-2 text-xs text-[#3D5245]">
                No classes added yet. Upload a Backpack screenshot or type courses in chat to see walk and bus times to each building.
              </p>
            ) : (
              <ul className="mt-2 space-y-2">
                {courseBuildingTimes.map(({ course, building, bt }, idx) => (
                  <li
                    key={`${course.code}-${course.term}-${idx}`}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-[#FCFDFB] px-2.5 py-2 text-xs"
                  >
                    <div>
                      <span className="font-semibold text-[#16241B]">{course.code}</span>
                      <span className="ml-1.5 text-[#3D5245]">
                        · {building ? `${building.name} (${building.code})` : "Building unset"}
                      </span>
                      {(course.source === "guess" || !course.confirmed) && (
                        <span className="ml-1.5 rounded bg-[#FBF1E8] px-1.5 py-0.5 text-[10px] font-semibold text-[#7A3415]">
                          please confirm
                        </span>
                      )}
                    </div>
                    {bt ? (
                      <div className="font-medium tabular-nums text-[#16241B]">
                        {Math.round(bt.walkMin)} min walk
                        {bt.busMin !== null ? ` · ${Math.round(bt.busMin)} min bus` : ""}
                      </div>
                    ) : (
                      <span className="text-[#3D5245]">Time unavailable</span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Nearest Bus Stops + Routes & Headsigns */}
          <div className="rounded-xl border border-[#E6ECE1] bg-[#F3F5EF] p-3">
            <div className="flex items-center gap-1.5 text-xs font-bold text-[#16241B]">
              <BusIcon size={15} className="text-[#2F6B47]" />
              <span>Nearest bus stops</span>
            </div>

            {isLoadingEnrichment ? (
              <p className="mt-2 text-xs text-[#3D5245]">Loading transit stops...</p>
            ) : !cachedEnrichment || cachedEnrichment.stops.length === 0 ? (
              <p className="mt-2 text-xs text-[#3D5245]">No bus stops within 800 m.</p>
            ) : (
              <ul className="mt-2 space-y-2">
                {cachedEnrichment.stops.map((stop) => (
                  <li
                    key={stop.stopId}
                    className="rounded-lg bg-[#FCFDFB] p-2.5 text-xs"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-[#16241B]">
                        {stop.stopName}{" "}
                        <span className="font-normal text-[#3D5245]">
                          ({stop.agency === "UM" ? "U-M" : "TheRide"})
                        </span>
                      </span>
                      <span className="shrink-0 font-semibold tabular-nums text-[#2F6B47]">
                        {Math.round(stop.walkMin)} min walk
                      </span>
                    </div>

                    {stop.routes.length > 0 && (
                      <ul className="mt-1.5 space-y-1 text-[11px] text-[#3D5245]">
                        {stop.routes.map((route) => (
                          <li key={route.routeId}>
                            <span className="font-medium text-[#16241B]">
                              {route.routeName}
                            </span>
                            {route.headsigns.length > 0 && (
                              <span>
                                {" "}
                                → {route.headsigns.slice(0, 2).join(" / ")}
                              </span>
                            )}
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        {/* Nearby Places (filtered strictly to profile.placeCategories) */}
        <section aria-label="Nearby places" className="space-y-2.5">
          <h3 className="font-heading text-sm font-bold uppercase tracking-wider text-[#3D5245]">
            Nearby
          </h3>

          {placeCategories.length === 0 ? (
            <div className="rounded-xl border border-[#C8D3C1] bg-[#F3F5EF] p-3.5">
              <p className="text-xs leading-relaxed text-[#3D5245]">
                We don&apos;t assume which kinds of places matter to you. Tell the assistant whether you care about groceries, cafes, gyms, restaurants, or bars.
              </p>
              <button
                type="button"
                onClick={askChatAboutPlaceCategories}
                className="mt-3 inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-[#2F6B47] px-4 py-2 text-xs font-semibold text-white hover:bg-[#245538]"
              >
                <ChatBubbleIcon size={15} />
                <span>Ask me about nearby places in chat</span>
              </button>
            </div>
          ) : isLoadingEnrichment ? (
            <p className="text-xs text-[#3D5245]">Loading nearby places...</p>
          ) : (
            <div className="space-y-2.5">
              {groupedNearbyPlaces.map((group) => (
                <div
                  key={group.category}
                  className="rounded-xl border border-[#E6ECE1] bg-[#F3F5EF] p-3"
                >
                  <div className="text-xs font-bold text-[#16241B]">{group.label}</div>
                  {group.places.length === 0 ? (
                    <p className="mt-1 text-xs text-[#3D5245]">None within 1 km.</p>
                  ) : (
                    <ul className="mt-1.5 space-y-1 text-xs">
                      {group.places.slice(0, 6).map((place, idx) => (
                        <li
                          key={`${place.name}-${idx}`}
                          className="flex items-center justify-between gap-2 rounded-md bg-[#FCFDFB] px-2.5 py-1.5"
                        >
                          <span className="truncate text-[#16241B]">{place.name}</span>
                          <span className="shrink-0 font-medium tabular-nums text-[#3D5245]">
                            {Math.round(place.walkMin)} min walk
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Source Provenance Line */}
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
    </aside>
  );
}
