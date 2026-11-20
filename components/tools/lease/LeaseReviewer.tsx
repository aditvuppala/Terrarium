"use client";

import { useCallback, useRef, useState } from "react";
import { ExternalLinkIcon, PrivacyShieldIcon, WarningIcon } from "@/components/ui/Icons";
import { formatMoney } from "@/lib/lease/checks";
import { STUDENT_LEGAL_SERVICES_URL } from "@/lib/lease/rules";
import { LeaseReviewResponse } from "@/lib/schemas";
import FindingCard from "./FindingCard";
import LeaseTextView from "./LeaseTextView";
import RenewCalculator from "./RenewCalculator";
import RulesList from "./RulesList";
import UploadPanel, { precheckFile } from "./UploadPanel";

type State =
  | { kind: "idle"; error: string | null }
  | { kind: "loading"; label: string }
  | { kind: "done"; review: LeaseReviewResponse };

function PrivacyNote() {
  return (
    <p className="flex items-start gap-2 text-sm leading-relaxed text-[#3D5245]">
      <PrivacyShieldIcon size={18} className="mt-0.5 shrink-0 text-[#2F6B47]" />
      <span>
        <strong className="font-semibold text-[#16241B]">Nothing is stored.</strong> Your file is read once to make this review and is never
        saved or logged. Leaving the page clears it.
      </span>
    </p>
  );
}

function LegalNote() {
  return (
    <div className="rounded-2xl border border-[#C8D3C1] bg-[#FCFDFB] p-4 text-sm leading-relaxed text-[#3D5245] sm:p-5">
      <p>
        <strong className="font-semibold text-[#16241B]">This isn&rsquo;t legal advice.</strong> It&rsquo;s an automated first pass that can miss
        problems or flag a clause that&rsquo;s fine in context, and a flagged clause doesn&rsquo;t make the rest of the lease invalid. Before you
        sign or pay anything, enrolled U-M students can ask Student Legal Services about a lease.
      </p>
      <a
        href={STUDENT_LEGAL_SERVICES_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-3 inline-flex min-h-[44px] items-center gap-1.5 rounded-xl bg-[#2F6B47] px-4 text-sm font-semibold text-white hover:bg-[#245538]"
      >
        U-M Student Legal Services
        <ExternalLinkIcon size={14} />
      </a>
    </div>
  );
}

function Spinner() {
  return (
    <svg className="h-8 w-8 animate-spin text-[#2F6B47]" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity="0.2" strokeWidth="3" />
      <path d="M22 12a10 10 0 0 0-10-10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

async function postReview(body: BodyInit, json: boolean): Promise<LeaseReviewResponse> {
  let res: Response;
  try {
    res = await fetch("/api/lease", {
      method: "POST",
      body,
      headers: json ? { "content-type": "application/json" } : undefined,
    });
  } catch {
    throw new Error("Couldn't reach the server. Check your connection and try again.");
  }
  const data: unknown = await res.json().catch(() => null);
  if (!res.ok) {
    const msg = data && typeof data === "object" && "error" in data && typeof data.error === "string" ? data.error : null;
    throw new Error(msg ?? `Something went wrong (error ${res.status}). Please try again.`);
  }
  const parsed = LeaseReviewResponse.safeParse(data);
  if (!parsed.success) throw new Error("We got an unexpected answer from the server. Please try again.");
  return parsed.data;
}

export default function LeaseReviewer() {
  const [state, setState] = useState<State>({ kind: "idle", error: null });
  const [activeId, setActiveId] = useState<string | null>(null);
  const markRefs = useRef(new Map<string, HTMLElement>());
  const cardRefs = useRef(new Map<string, HTMLLIElement>());

  const run = useCallback(async (label: string, body: BodyInit, json: boolean) => {
    setState({ kind: "loading", label });
    setActiveId(null);
    try {
      const review = await postReview(body, json);
      setState({ kind: "done", review });
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      setState({ kind: "idle", error: err instanceof Error ? err.message : String(err) });
    }
  }, []);

  const onFile = (file: File) => {
    const problem = precheckFile(file);
    if (problem) {
      setState({ kind: "idle", error: problem });
      return;
    }
    const form = new FormData();
    form.append("file", file);
    void run(`Reading ${file.name}…`, form, false);
  };

  const onSample = () => void run("Reviewing the sample lease…", JSON.stringify({ sample: true }), true);

  const selectFinding = (id: string) => {
    setActiveId(id);
    markRefs.current.get(id)?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  const selectFromText = (ids: string[]) => {
    const i = activeId ? ids.indexOf(activeId) : -1;
    const id = ids[(i + 1) % ids.length]; // clicking again cycles through overlapping findings
    setActiveId(id);
    cardRefs.current.get(id)?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  };

  if (state.kind === "loading") {
    return (
      <div className="flex flex-col items-center rounded-2xl border border-[#C8D3C1] bg-[#FCFDFB] px-6 py-16 text-center" role="status" aria-live="polite">
        <Spinner />
        <p className="font-heading mt-4 text-lg font-bold text-[#16241B]">{state.label}</p>
        <p className="mt-1 max-w-md text-sm text-[#3D5245]">
          We read the text, then check each clause against the rules. A long PDF can take up to a minute.
        </p>
      </div>
    );
  }

  if (state.kind === "idle") {
    return (
      <div className="space-y-6">
        {state.error && (
          <div role="alert" className="flex items-start gap-2.5 rounded-2xl border border-[#E2B4B1] bg-[#FBECEB] px-4 py-3 text-sm text-[#84231F]">
            <WarningIcon size={18} className="mt-0.5 shrink-0" />
            <span>{state.error}</span>
          </div>
        )}
        <UploadPanel onFile={onFile} onSample={onSample} />
        <PrivacyNote />
        <div className="grid gap-6 lg:grid-cols-2">
          <RenewCalculator />
          <RulesList />
        </div>
        <LegalNote />
      </div>
    );
  }

  const { review } = state;
  const { findings, facts } = review;
  const factItems = [
    facts.monthlyRent !== null && `Rent ${formatMoney(facts.monthlyRent)}/mo`,
    facts.securityDeposit !== null && `Deposit ${formatMoney(facts.securityDeposit)}`,
    facts.applicationFee !== null && `Application fee ${formatMoney(facts.applicationFee)}`,
  ].filter(Boolean) as string[];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 rounded-2xl border border-[#C8D3C1] bg-[#FCFDFB] p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-heading text-2xl font-bold text-[#16241B]">
              {findings.length === 0
                ? "Nothing flagged"
                : `${findings.length} ${findings.length === 1 ? "clause" : "clauses"} to ask about`}
            </h2>
            {review.source === "sample" && (
              <span className="rounded-full bg-[#DFEAE2] px-2.5 py-0.5 text-xs font-semibold text-[#2F6B47]">Fictional sample lease</span>
            )}
          </div>
          {factItems.length > 0 && <p className="mt-1 text-sm text-[#3D5245]">We read: {factItems.join(" · ")}</p>}
        </div>
        <button
          type="button"
          onClick={() => setState({ kind: "idle", error: null })}
          className="inline-flex min-h-[44px] shrink-0 items-center justify-center rounded-xl border border-[#C8D3C1] bg-[#FCFDFB] px-4 text-sm font-semibold text-[#16241B] hover:border-[#2F6B47] hover:bg-[#DFEAE2]"
        >
          Check another lease
        </button>
      </div>

      {review.warnings.length > 0 && (
        <ul className="space-y-1.5 rounded-2xl border border-[#DFB391] bg-[#FBF1E8] px-4 py-3 text-sm text-[#7A3415]">
          {review.warnings.map((w) => (
            <li key={w} className="flex items-start gap-2">
              <WarningIcon size={16} className="mt-0.5 shrink-0" />
              <span>{w}</span>
            </li>
          ))}
        </ul>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:items-start">
        <section aria-label="Your lease" className="order-2 rounded-2xl border border-[#C8D3C1] bg-[#FCFDFB] lg:order-1">
          <div className="flex items-center justify-between border-b border-[#C8D3C1] px-4 py-3 sm:px-5">
            <h2 className="font-heading text-lg font-bold text-[#16241B]">Your lease</h2>
            <span className="flex items-center gap-1.5 text-xs text-[#3D5245]">
              <span className="inline-block h-3 w-5 rounded-[3px] bg-[#FBF1E8] shadow-[inset_0_-2px_0_#DFB391]" aria-hidden="true" />
              Flagged clause
            </span>
          </div>
          <div className="px-4 py-4 sm:px-6 sm:py-5 lg:max-h-[calc(100vh-9rem)] lg:overflow-y-auto">
            <LeaseTextView text={review.text} findings={findings} activeId={activeId} onSelect={selectFromText} markRefs={markRefs} />
          </div>
        </section>

        <section aria-label="What we found" className="order-1 lg:order-2 lg:max-h-[calc(100vh-9rem)] lg:overflow-y-auto lg:pr-1">
          {findings.length === 0 ? (
            <div className="rounded-2xl border border-[#C8D3C1] bg-[#FCFDFB] p-5 text-sm leading-relaxed text-[#3D5245]">
              We didn&rsquo;t find clauses matching the rules we check. That doesn&rsquo;t mean the lease is problem-free: we only check a fixed
              list, and we can&rsquo;t judge everything.
            </div>
          ) : (
            <ol className="space-y-3">
              {findings.map((f, i) => (
                <FindingCard
                  key={f.id}
                  ref={(el) => {
                    if (el) cardRefs.current.set(f.id, el);
                    else cardRefs.current.delete(f.id);
                  }}
                  finding={f}
                  number={i + 1}
                  active={f.id === activeId}
                  onSelect={() => selectFinding(f.id)}
                />
              ))}
            </ol>
          )}
        </section>
      </div>

      <PrivacyNote />
      <LegalNote />
      <RenewCalculator />
    </div>
  );
}
