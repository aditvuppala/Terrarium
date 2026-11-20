"use client";

import { useSyncExternalStore } from "react";
import { THEME_EVENT, getTheme, type Theme } from "@/components/ui/theme";

function subscribe(onChange: () => void): () => void {
  window.addEventListener(THEME_EVENT, onChange);
  // Also catch direct changes to <html data-theme> (e.g. another tab's script or devtools).
  const mo = new MutationObserver(onChange);
  mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  return () => {
    window.removeEventListener(THEME_EVENT, onChange);
    mo.disconnect();
  };
}

/** The site-wide theme, updated live when the theme toggle changes it. */
export function useTheme(): Theme {
  return useSyncExternalStore(subscribe, getTheme, () => "light");
}
