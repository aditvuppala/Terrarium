import Link from "next/link";
import { ChevronRightIcon, PrivacyShieldIcon, TerrariumMark } from "@/components/ui/Icons";
import { RiverValley, SideTrees, SkyDecor } from "@/components/landing/ForestScene";
import { QuestionTicker } from "@/components/landing/QuestionTicker";

export default function WelcomePage() {
  return (
    <main className="relative flex min-h-screen flex-1 flex-col overflow-hidden bg-linear-to-b from-[#B7E0E2] to-[#DCF0E3]">
      <SkyDecor />
      <SideTrees />

      {/* Hero: logo, name, headline (sits in the sky) */}
      <section className="relative z-10 mx-auto w-full max-w-3xl px-5 pt-10 pb-8 sm:px-8 sm:pt-14 sm:pb-12">
        <div className="flex items-center gap-4 sm:gap-5">
          <TerrariumMark size={88} className="shrink-0 drop-shadow-[0_6px_14px_rgba(22,36,27,0.18)] sm:h-[120px] sm:w-[120px]" />
          <span className="font-heading text-4xl font-bold tracking-tight text-[#16241B] sm:text-6xl">
            Terrarium
          </span>
        </div>

        <h1 className="font-heading mt-6 max-w-2xl text-3xl font-bold leading-tight text-[#16241B] sm:text-5xl">
          Housing that works for{" "}
          <span className="relative inline-block">
            you
            <svg
              aria-hidden="true"
              viewBox="0 0 120 14"
              preserveAspectRatio="none"
              className="absolute -bottom-2 left-[-4%] h-3 w-[108%] sm:-bottom-3 sm:h-4"
            >
              <path d="M3 9 C30 3 62 3 117 7" fill="none" stroke="#E8783F" strokeWidth="5" strokeLinecap="round" />
            </svg>
          </span>
          .
        </h1>

        <p className="mt-5 max-w-xl text-base leading-relaxed text-[#2E4436] sm:text-lg">
          We weigh everything you&apos;d look for in a place, plus a few things you might not think to check until after you&apos;ve signed.
        </p>
      </section>

      {/* Meadow + river, with the choices on top */}
      <section className="relative flex-1">
        <RiverValley />
        <div className="relative z-10 mx-auto w-full max-w-3xl px-5 pt-12 pb-12 sm:px-8 sm:pt-16">
        <QuestionTicker />

        <div className="relative isolate mt-9">
        {/* soft light hugging the buttons + note so they stand out from the forest */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -inset-x-12 -top-10 -bottom-8 -z-10 bg-[radial-gradient(closest-side,rgba(248,251,244,0.95),rgba(248,251,244,0.75)_55%,rgba(248,251,244,0))] sm:-inset-x-24 sm:-top-14 sm:-bottom-12"
        />

        {/* Two Large Choices */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Link
            href="/onboarding"
            className="group flex min-h-[132px] flex-col justify-between rounded-2xl border-2 border-[#2F6B47] bg-[#2F6B47] p-6 text-left text-white transition-colors hover:border-[#245538] hover:bg-[#245538]"
          >
            <div className="flex items-start justify-between gap-3">
              <span className="font-heading text-xl font-semibold leading-snug">
                Help me find housing!
              </span>
              <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#FCFDFB]/15 text-white transition-transform group-hover:translate-x-0.5">
                <ChevronRightIcon size={20} />
              </span>
            </div>
            <span className="mt-3 text-sm leading-relaxed text-[#E6ECE1]">
              A curated feed, with guidance along the way.
            </span>
          </Link>

          <Link
            href="/explore"
            className="group flex min-h-[132px] flex-col justify-between rounded-2xl border-2 border-[#C8D3C1] bg-[#FCFDFB] p-6 text-left text-[#16241B] transition-colors hover:border-[#2F6B47] hover:bg-[#E6ECE1]/60"
          >
            <div className="flex items-start justify-between gap-3">
              <span className="font-heading text-xl font-semibold leading-snug text-[#16241B]">
                I&apos;ve got this on my own
              </span>
              <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#C8D3C1] bg-[#F3F5EF] text-[#16241B] transition-transform group-hover:translate-x-0.5">
                <ChevronRightIcon size={20} />
              </span>
            </div>
            <span className="mt-3 text-sm leading-relaxed text-[#3D5245]">
              Unguided browse mode. Explore every listing on the map.
            </span>
          </Link>
        </div>

        {/* Small privacy note */}
        <p className="mt-7 flex items-center justify-center gap-2 text-center text-sm text-[#3D5245]">
          <PrivacyShieldIcon size={16} className="shrink-0 text-[#2F6B47]" />
          <span>We only use what you tell us. Nothing is stored.</span>
        </p>
        </div>
        </div>
      </section>
    </main>
  );
}
