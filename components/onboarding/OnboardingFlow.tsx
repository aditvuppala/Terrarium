"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import majorsJson from "@/data/majors.json";
import { YEAR_LABELS } from "@/components/shared/constants";
import { CheckIcon, ChevronLeftIcon, ChevronRightIcon, TerrariumMark } from "@/components/ui/Icons";
import { Year, type Campus } from "@/lib/schemas";
import { useTerrarium } from "@/lib/store";

interface MajorEntry {
  name: string;
  campus: "north" | "central";
}

const MAJORS: MajorEntry[] = majorsJson as MajorEntry[];

export default function OnboardingFlow() {
  const router = useRouter();
  const existingYear = useTerrarium((s) => s.profile.year);
  const existingMajor = useTerrarium((s) => s.profile.major);
  const existingCampus = useTerrarium((s) => s.profile.majorCampus);
  const patchProfile = useTerrarium((s) => s.patchProfile);

  const [step, setStep] = useState<1 | 2>(1);
  const [selectedYear, setSelectedYear] = useState<Year | null>(existingYear);
  const [query, setQuery] = useState<string>(existingMajor ?? "");
  const [dropdownOpen, setDropdownOpen] = useState<boolean>(true);
  const [pickedMajor, setPickedMajor] = useState<{
    name: string;
    campus: Campus | null;
  } | null>(
    existingMajor ? { name: existingMajor, campus: existingCampus } : null,
  );

  const trimmedQuery = query.trim();

  const groupedMajors = useMemo(() => {
    const q = trimmedQuery.toLowerCase();
    const filtered = q
      ? MAJORS.filter((m) => m.name.toLowerCase().includes(q))
      : MAJORS;
    return {
      north: filtered.filter((m) => m.campus === "north"),
      central: filtered.filter((m) => m.campus === "central"),
      totalCount: filtered.length,
      exactMatch: MAJORS.find((m) => m.name.toLowerCase() === q) ?? null,
    };
  }, [trimmedQuery]);

  function handleYearPick(year: Year) {
    setSelectedYear(year);
    patchProfile({ year });
    setStep(2);
  }

  function finishWithMajor(majorName: string, campus: Campus | null) {
    const state = useTerrarium.getState();
    const hasUserMessages = state.messages.some((m) => m.role === "user");
    if (!hasUserMessages && state.chatBootstrapped) {
      useTerrarium.setState({ messages: [], nextQuestion: null, chatBootstrapped: false });
    }
    patchProfile({
      year: selectedYear,
      major: majorName,
      majorCampus: campus,
    });
    router.push("/explore");
  }

  const progressPct = step === 1 ? 50 : 100;

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-2xl flex-col justify-between px-5 py-8 sm:px-8">
      {/* Header + Progress Bar */}
      <header className="space-y-5">
        <div className="flex items-center justify-between gap-4">
          <Link
            href="/"
            className="inline-flex min-h-[44px] items-center gap-2.5 rounded-xl px-2 py-1 text-[#16241B] hover:bg-[#E6ECE1]"
          >
            <TerrariumMark size={26} />
            <span className="font-heading text-lg font-bold">Terrarium</span>
          </Link>

          <Link
            href="/explore"
            className="inline-flex min-h-[44px] items-center rounded-xl px-3 text-sm font-medium text-[#3D5245] hover:bg-[#E6ECE1] hover:text-[#16241B]"
          >
            Skip to map
          </Link>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-[#3D5245]">
            <span>Step {step} of 2</span>
            <span>{progressPct}%</span>
          </div>
          <div
            role="progressbar"
            aria-label="Onboarding progress"
            aria-valuenow={progressPct}
            aria-valuemin={0}
            aria-valuemax={100}
            className="h-2.5 w-full overflow-hidden rounded-full bg-[#DCE5D5]"
          >
            <div
              className="h-full rounded-full bg-[#2F6B47] transition-all duration-300 ease-out"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
      </header>

      {/* Active Question Card */}
      <section className="my-8 rounded-2xl border border-[#C8D3C1] bg-[#FCFDFB] p-6 sm:p-9">
        {step === 1 ? (
          <div>
            <h1 className="font-heading text-2xl font-bold text-[#16241B] sm:text-3xl">
              What year are you?
            </h1>
            <p className="mt-2 text-sm text-[#3D5245]">
              Pick the option that best fits your upcoming Ann Arbor lease.
            </p>

            <div
              role="group"
              aria-label="Class year choices"
              className="mt-6 flex flex-wrap gap-3"
            >
              {Year.options.map((yr) => {
                const active = selectedYear === yr;
                const info = YEAR_LABELS[yr];
                return (
                  <button
                    key={yr}
                    type="button"
                    aria-pressed={active}
                    onClick={() => handleYearPick(yr)}
                    className={`inline-flex min-h-[48px] items-center gap-2.5 rounded-full border-2 px-5 py-2.5 text-base font-medium transition-colors ${
                      active
                        ? "border-[#2F6B47] bg-[#2F6B47] text-white"
                        : "border-[#C8D3C1] bg-[#F3F5EF] text-[#16241B] hover:border-[#2F6B47] hover:bg-[#E6ECE1]"
                    }`}
                  >
                    <span>{info.label}</span>
                    {active && <CheckIcon size={16} />}
                  </button>
                );
              })}
            </div>

            {selectedYear && (
              <div className="mt-8 flex justify-end border-t border-[#E6ECE1] pt-5">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-[#2F6B47] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#245538]"
                >
                  <span>Continue</span>
                  <ChevronRightIcon size={18} />
                </button>
              </div>
            )}
          </div>
        ) : (
          <div>
            <h1 className="font-heading text-2xl font-bold text-[#16241B] sm:text-3xl">
              What&apos;s your major?
            </h1>
            <p className="mt-2 text-sm text-[#3D5245]">
              We use this to anchor your initial commute estimate before you add specific classes.
            </p>

            <div className="mt-6">
              <label
                htmlFor="major-filter-input"
                className="block text-sm font-semibold text-[#16241B]"
              >
                Search or type your major
              </label>
              <div className="relative mt-2">
                <input
                  id="major-filter-input"
                  type="text"
                  value={query}
                  autoFocus
                  autoComplete="off"
                  placeholder="e.g. Computer Science, Economics, Nursing..."
                  onChange={(e) => {
                    const val = e.target.value;
                    setQuery(val);
                    setDropdownOpen(true);
                    const exact = MAJORS.find(
                      (m) => m.name.toLowerCase() === val.trim().toLowerCase(),
                    );
                    setPickedMajor(
                      exact
                        ? { name: exact.name, campus: exact.campus }
                        : val.trim()
                          ? { name: val.trim(), campus: null }
                          : null,
                    );
                  }}
                  onFocus={() => setDropdownOpen(true)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && trimmedQuery) {
                      e.preventDefault();
                      if (groupedMajors.exactMatch) {
                        finishWithMajor(
                          groupedMajors.exactMatch.name,
                          groupedMajors.exactMatch.campus,
                        );
                      } else if (groupedMajors.totalCount === 1) {
                        const sole =
                          groupedMajors.north[0] ?? groupedMajors.central[0];
                        finishWithMajor(sole.name, sole.campus);
                      } else {
                        finishWithMajor(trimmedQuery, null);
                      }
                    }
                  }}
                  className="min-h-[48px] w-full rounded-xl border-2 border-[#C8D3C1] bg-[#F3F5EF] px-4 py-2.5 text-base text-[#16241B] placeholder:text-[#3D5245]/70 focus:border-[#2F6B47] focus:bg-[#FCFDFB] focus:outline-none"
                />

                {/* Grouped Live-Filtered Dropdown */}
                {dropdownOpen && (
                  <div
                    role="listbox"
                    aria-label="Matching majors by campus"
                    className="mt-2 max-h-72 overflow-y-auto rounded-xl border border-[#C8D3C1] bg-[#FCFDFB] p-2 shadow-sm"
                  >
                    {groupedMajors.north.length > 0 && (
                      <div className="mb-2">
                        <div className="px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-[#2F6B47]">
                          North Campus
                        </div>
                        <div className="space-y-1">
                          {groupedMajors.north.map((m) => {
                            const isSelected = pickedMajor?.name === m.name;
                            return (
                              <button
                                key={m.name}
                                type="button"
                                role="option"
                                aria-selected={isSelected}
                                onClick={() => {
                                  setQuery(m.name);
                                  setPickedMajor({ name: m.name, campus: m.campus });
                                  finishWithMajor(m.name, m.campus);
                                }}
                                className={`flex min-h-[44px] w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors ${
                                  isSelected
                                    ? "bg-[#DFEAE2] text-[#16241B]"
                                    : "text-[#16241B] hover:bg-[#E6ECE1]"
                                }`}
                              >
                                <span>{m.name}</span>
                                <span className="rounded-full bg-[#E6ECE1] px-2.5 py-0.5 text-xs text-[#3D5245]">
                                  North
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {groupedMajors.central.length > 0 && (
                      <div>
                        <div className="px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-[#2F6B47]">
                          Central Campus
                        </div>
                        <div className="space-y-1">
                          {groupedMajors.central.map((m) => {
                            const isSelected = pickedMajor?.name === m.name;
                            return (
                              <button
                                key={m.name}
                                type="button"
                                role="option"
                                aria-selected={isSelected}
                                onClick={() => {
                                  setQuery(m.name);
                                  setPickedMajor({ name: m.name, campus: m.campus });
                                  finishWithMajor(m.name, m.campus);
                                }}
                                className={`flex min-h-[44px] w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors ${
                                  isSelected
                                    ? "bg-[#DFEAE2] text-[#16241B]"
                                    : "text-[#16241B] hover:bg-[#E6ECE1]"
                                }`}
                              >
                                <span>{m.name}</span>
                                <span className="rounded-full bg-[#E6ECE1] px-2.5 py-0.5 text-xs text-[#3D5245]">
                                  Central
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Custom fallback when nothing matches (or non-exact typed string) */}
                    {trimmedQuery.length > 0 && !groupedMajors.exactMatch && (
                      <div className={groupedMajors.totalCount > 0 ? "mt-2 border-t border-[#E6ECE1] pt-2" : ""}>
                        {groupedMajors.totalCount === 0 && (
                          <p className="px-3 py-1.5 text-xs text-[#3D5245]">
                            No preset U-M major matched &ldquo;{trimmedQuery}&rdquo;.
                          </p>
                        )}
                        <button
                          type="button"
                          role="option"
                          aria-selected={pickedMajor?.name === trimmedQuery && pickedMajor.campus === null}
                          onClick={() => finishWithMajor(trimmedQuery, null)}
                          className="flex min-h-[44px] w-full items-center justify-between rounded-lg bg-[#F3F5EF] px-3 py-2 text-left text-sm font-semibold text-[#16241B] hover:bg-[#DFEAE2]"
                        >
                          <span>Use &apos;{trimmedQuery}&apos;</span>
                          <span className="text-xs font-normal text-[#3D5245]">
                            Ask campus in chat
                          </span>
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="mt-7 flex flex-wrap items-center justify-between gap-3 border-t border-[#E6ECE1] pt-5">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border border-[#C8D3C1] bg-[#F3F5EF] px-4 py-2 text-sm font-semibold text-[#16241B] hover:bg-[#E6ECE1]"
              >
                <ChevronLeftIcon size={18} />
                <span>Back</span>
              </button>

              <button
                type="button"
                disabled={!trimmedQuery}
                onClick={() => {
                  if (!trimmedQuery) return;
                  if (groupedMajors.exactMatch) {
                    finishWithMajor(
                      groupedMajors.exactMatch.name,
                      groupedMajors.exactMatch.campus,
                    );
                  } else {
                    finishWithMajor(
                      pickedMajor?.name ?? trimmedQuery,
                      pickedMajor?.campus ?? null,
                    );
                  }
                }}
                className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-[#2F6B47] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#245538] disabled:cursor-not-allowed disabled:opacity-45"
              >
                <span>Explore housing</span>
                <ChevronRightIcon size={18} />
              </button>
            </div>
          </div>
        )}
      </section>

      <footer className="text-center text-xs text-[#3D5245]">
        We only use what you tell us. Nothing is stored.
      </footer>
    </div>
  );
}
