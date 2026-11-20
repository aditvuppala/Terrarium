import Link from "next/link";
import type { ReactNode } from "react";
import { ChevronLeftIcon, TerrariumMark } from "@/components/ui/Icons";
import ThemeToggle from "@/components/ui/ThemeToggle";

/**
 * Shared page frame for the renter tools (lease reviewer, deposit vault, rent splitter):
 * header with brand + "Back to map", a title block, and a centered content column.
 */
export default function ToolShell({
  title,
  intro,
  children,
}: {
  title: string;
  intro: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#F3F5EF]">
      <header className="border-b border-[#C8D3C1] bg-[#F3F5EF] px-4 py-3 sm:px-6">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4">
          <Link
            href="/"
            className="inline-flex min-h-[44px] items-center gap-2.5 rounded-xl px-2 py-1 text-[#16241B] hover:bg-[#E6ECE1]"
          >
            <TerrariumMark size={28} />
            <span className="font-heading text-xl font-bold tracking-tight">Terrarium</span>
          </Link>
          <div className="flex items-center gap-2">
          <ThemeToggle />
          <Link
            href="/explore"
            className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border border-[#C8D3C1] bg-[#FCFDFB] px-3.5 text-sm font-semibold text-[#16241B] hover:border-[#2F6B47] hover:bg-[#DFEAE2]"
          >
            <ChevronLeftIcon size={18} />
            <span>Back to map</span>
          </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-10">
        <h1 className="font-heading text-3xl font-bold text-[#16241B] sm:text-4xl">{title}</h1>
        <div className="mt-2 max-w-2xl text-base leading-relaxed text-[#3D5245]">{intro}</div>
        <div className="mt-8">{children}</div>
      </main>
    </div>
  );
}
