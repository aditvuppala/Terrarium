"use client";

import { useSyncExternalStore } from "react";
import { THEME_EVENT, getTheme, setTheme } from "@/components/ui/theme";

function subscribe(cb: () => void) {
  window.addEventListener(THEME_EVENT, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(THEME_EVENT, cb);
    window.removeEventListener("storage", cb);
  };
}

/** Compact day/night switch for page headers (the landing page has its own animated one). */
export default function ThemeToggle() {
  const dark = useSyncExternalStore(subscribe, () => getTheme() === "dark", () => false);
  return (
    <button
      type="button"
      role="switch"
      aria-checked={dark}
      aria-label="Night mode"
      title={dark ? "Switch to day" : "Switch to night"}
      onClick={() => setTheme(dark ? "light" : "dark")}
      className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[#C8D3C1] bg-[#FCFDFB] text-[#16241B] hover:border-[#2F6B47] hover:bg-[#DFEAE2]"
    >
      {dark ? (
        <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
          <path d="M20 14.6A8.2 8.2 0 0 1 9.4 4a8.2 8.2 0 1 0 10.6 10.6Z" fill="currentColor" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" width="19" height="19" aria-hidden="true">
          <circle cx="12" cy="12" r="4.5" fill="currentColor" />
          <path
            d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.3 5.3l1.6 1.6M17.1 17.1l1.6 1.6M5.3 18.7l1.6-1.6M17.1 6.9l1.6-1.6"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      )}
    </button>
  );
}
