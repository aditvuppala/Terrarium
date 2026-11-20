"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { TOOLS } from "@/components/tools/tools";

/** Three-line menu button that opens a left drawer with the renter tools. */
export default function ToolsMenu() {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    panelRef.current?.querySelector<HTMLElement>("a,button")?.focus();
    const button = buttonRef.current;
    return () => {
      document.removeEventListener("keydown", onKey);
      button?.focus();
    };
  }, [open]);

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        aria-label="Open renter tools"
        aria-expanded={open}
        aria-controls="tools-drawer"
        onClick={() => setOpen(true)}
        className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[#C8D3C1] bg-[#FCFDFB] text-[#16241B] hover:border-[#2F6B47] hover:bg-[#DFEAE2]"
      >
        <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true">
          <path d="M3 5h14M3 10h14M3 15h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </button>

      {open && (
        <div className="fixed inset-0 z-[1000]">
          <button
            type="button"
            aria-label="Close renter tools"
            tabIndex={-1}
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-[#16241B]/35"
          />
          <div
            id="tools-drawer"
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label="Renter tools"
            className="absolute inset-y-0 left-0 flex w-[min(360px,88vw)] flex-col border-r border-[#C8D3C1] bg-[#FCFDFB] shadow-[8px_0_30px_rgba(22,36,27,0.18)]"
          >
            <div className="flex items-center justify-between border-b border-[#E6ECE1] px-5 py-4">
              <span className="font-heading text-lg font-bold text-[#16241B]">Renter tools</span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-[#3D5245] hover:bg-[#E6ECE1] hover:text-[#16241B]"
              >
                <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
                  <path d="M4 4l10 10M14 4L4 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </button>
            </div>
            <nav className="flex flex-col gap-2 p-4">
              {TOOLS.map((t) => (
                <Link
                  key={t.href}
                  href={t.href}
                  onClick={() => setOpen(false)}
                  className="rounded-xl border border-[#C8D3C1] bg-[#F3F5EF] px-4 py-3.5 hover:border-[#2F6B47] hover:bg-[#DFEAE2]"
                >
                  <span className="block font-heading text-base font-semibold text-[#16241B]">{t.title}</span>
                  <span className="mt-1 block text-sm leading-snug text-[#3D5245]">{t.blurb}</span>
                </Link>
              ))}
            </nav>
          </div>
        </div>
      )}
    </>
  );
}
