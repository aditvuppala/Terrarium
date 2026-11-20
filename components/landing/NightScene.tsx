"use client";

import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { THEME_EVENT, getTheme, setTheme } from "@/components/ui/theme";

/**
 * Landing-page wrapper that owns the day/night switch. It only flips
 * `data-night` on the <main> element; every visual change (sun setting, moon
 * rising, sky, stars, darker landscape) is a CSS transition keyed off that
 * attribute (see `.tr-scene` in globals.css), so the scene itself stays
 * server-rendered.
 *
 * While the sun/moon animation runs the switch is busy: it ignores clicks and
 * keys (aria-disabled, so keyboard focus is kept) until the animation ends.
 */

/** Must match the longest transition (delay + duration) in globals.css. */
const TRANSITION_MS = 3000;

function subscribe(cb: () => void) {
  window.addEventListener(THEME_EVENT, cb);
  return () => window.removeEventListener(THEME_EVENT, cb);
}

export function NightScene({ className = "", children }: { className?: string; children: ReactNode }) {
  // Shared site-wide theme (components/ui/theme.ts); server render is always day.
  const night = useSyncExternalStore(subscribe, () => getTheme() === "dark", () => false);
  const [busy, setBusy] = useState(false);
  const [animated, setAnimated] = useState(false);
  const busyRef = useRef(false);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  function toggle() {
    if (busyRef.current) return;
    let reduce = false;
    try {
      reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    } catch {
      // matchMedia unavailable: animate normally
    }
    setTheme(night ? "light" : "dark");
    setAnimated(true);
    if (reduce) return;
    busyRef.current = true;
    setBusy(true);
    timer.current = window.setTimeout(() => {
      busyRef.current = false;
      setBusy(false);
    }, TRANSITION_MS);
  }

  return (
    <main
      className={`tr-scene ${className}`}
      data-night={night ? "true" : "false"}
      data-animate={animated ? "true" : undefined}
    >
      <button
        type="button"
        role="switch"
        aria-checked={night}
        aria-label="Night mode"
        aria-disabled={busy || undefined}
        title={busy ? undefined : night ? "Switch to day" : "Switch to night"}
        onClick={toggle}
        className="tr-switch absolute right-4 top-4 z-30 sm:right-6 sm:top-6"
      >
        <span className="tr-switch-knob" aria-hidden="true">
          {/* sun */}
          <svg className="tr-switch-sun" viewBox="0 0 24 24" width="18" height="18" focusable="false">
            <circle cx="12" cy="12" r="4.5" fill="currentColor" />
            <g stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.3 5.3l1.6 1.6M17.1 17.1l1.6 1.6M5.3 18.7l1.6-1.6M17.1 6.9l1.6-1.6" />
            </g>
          </svg>
          {/* moon */}
          <svg className="tr-switch-moon" viewBox="0 0 24 24" width="17" height="17" focusable="false">
            <path d="M20 14.6A8.2 8.2 0 0 1 9.4 4a8.2 8.2 0 1 0 10.6 10.6Z" fill="currentColor" />
          </svg>
        </span>
      </button>
      {children}
    </main>
  );
}
