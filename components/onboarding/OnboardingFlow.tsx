"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import MajorStep from "@/components/onboarding/MajorStep";
import YearStep from "@/components/onboarding/YearStep";
import { TerrariumMark } from "@/components/ui/Icons";
import ThemeToggle from "@/components/ui/ThemeToggle";
import type { Campus, Year } from "@/lib/schemas";
import { useTerrarium } from "@/lib/store";

export default function OnboardingFlow() {
  const router = useRouter();
  const existingYear = useTerrarium((s) => s.profile.year);
  const existingMajor = useTerrarium((s) => s.profile.major);
  const existingCampus = useTerrarium((s) => s.profile.majorCampus);
  const patchProfile = useTerrarium((s) => s.patchProfile);

  const [step, setStep] = useState<1 | 2>(1);
  const [selectedYear, setSelectedYear] = useState<Year | null>(existingYear);
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
    <div className="mx-auto flex min-h-screen w-full max-w-5xl flex-col justify-between px-5 py-8 sm:px-8">
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

          <div className="flex items-center gap-2">
            <Link
              href="/explore"
              className="inline-flex min-h-[44px] items-center rounded-xl px-3 text-sm font-medium text-[#3D5245] hover:bg-[#E6ECE1] hover:text-[#16241B]"
            >
              Skip to map
            </Link>
            <ThemeToggle />
          </div>
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
          <YearStep selectedYear={selectedYear} onPick={handleYearPick} onContinue={() => setStep(2)} />
        ) : (
          <MajorStep
            initialMajor={existingMajor ? { name: existingMajor, campus: existingCampus } : null}
            onFinish={finishWithMajor}
            onBack={() => setStep(1)}
          />
        )}
      </section>

      <footer className="text-center text-xs text-[#3D5245]">
        We only use what you tell us. Nothing is stored.
      </footer>
    </div>
  );
}
