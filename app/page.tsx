import Link from "next/link";
import { ChevronRightIcon, PrivacyShieldIcon, TerrariumMark } from "@/components/ui/Icons";

export default function WelcomePage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-5 py-12 sm:px-8">
      <div className="w-full max-w-2xl">
        {/* Logo + Wordmark */}
        <div className="flex flex-col items-center text-center">
          <div className="mb-5 inline-flex items-center gap-3 rounded-2xl border border-[#C8D3C1] bg-[#FCFDFB] px-4 py-2.5">
            <TerrariumMark size={34} />
            <span className="font-heading text-2xl font-bold tracking-tight text-[#16241B]">
              Terrarium
            </span>
          </div>

          <h1 className="font-heading max-w-xl text-3xl font-bold leading-tight text-[#16241B] sm:text-5xl">
            Choose Ann Arbor housing around your actual week.
          </h1>

          <p className="mt-4 max-w-lg text-base leading-relaxed text-[#3D5245] sm:text-lg">
            Compare U-M off-campus listings ranked deterministically by your classes, commute, budget, and dealbreakers, with every shortfall shown in plain sight.
          </p>
        </div>

        {/* Two Large Choices */}
        <div className="mt-9 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Link
            href="/onboarding"
            className="group flex min-h-[132px] flex-col justify-between rounded-2xl border-2 border-[#2F6B47] bg-[#2F6B47] p-6 text-left text-white transition-colors hover:border-[#245538] hover:bg-[#245538]"
          >
            <div className="flex items-start justify-between gap-3">
              <span className="font-heading text-xl font-semibold leading-snug">
                Help me narrow it down
              </span>
              <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#FCFDFB]/15 text-white transition-transform group-hover:translate-x-0.5">
                <ChevronRightIcon size={20} />
              </span>
            </div>
            <span className="mt-3 text-sm leading-relaxed text-[#E6ECE1]">
              Answer two quick questions about your year and major before exploring.
            </span>
          </Link>

          <Link
            href="/explore"
            className="group flex min-h-[132px] flex-col justify-between rounded-2xl border-2 border-[#C8D3C1] bg-[#FCFDFB] p-6 text-left text-[#16241B] transition-colors hover:border-[#2F6B47] hover:bg-[#E6ECE1]/60"
          >
            <div className="flex items-start justify-between gap-3">
              <span className="font-heading text-xl font-semibold leading-snug text-[#16241B]">
                Just browse
              </span>
              <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#C8D3C1] bg-[#F3F5EF] text-[#16241B] transition-transform group-hover:translate-x-0.5">
                <ChevronRightIcon size={20} />
              </span>
            </div>
            <span className="mt-3 text-sm leading-relaxed text-[#3D5245]">
              Jump straight to the ranked Ann Arbor map and refine anytime.
            </span>
          </Link>
        </div>

        {/* Small privacy note */}
        <p className="mt-7 flex items-center justify-center gap-2 text-center text-sm text-[#3D5245]">
          <PrivacyShieldIcon size={16} className="shrink-0 text-[#2F6B47]" />
          <span>We only use what you tell us. Nothing is stored.</span>
        </p>
      </div>
    </main>
  );
}
