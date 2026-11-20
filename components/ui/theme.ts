/**
 * Site-wide day/night theme. The choice lives on <html data-theme="dark|light">
 * and in localStorage (this device only). app/layout.tsx applies the saved value
 * before first paint (THEME_INIT_SCRIPT) so pages don't flash.
 */
export type Theme = "light" | "dark";

export const THEME_KEY = "terrarium-theme";
export const THEME_EVENT = "terrarium-theme-change";

/** Inline script for <head>: apply the saved theme before the page renders. */
export const THEME_INIT_SCRIPT = `try{var t=localStorage.getItem("${THEME_KEY}");if(t==="dark"||t==="light")document.documentElement.dataset.theme=t;}catch(e){}`;

export function getTheme(): Theme {
  if (typeof document === "undefined") return "light";
  return document.documentElement.dataset.theme === "dark" ? "dark" : "light";
}

export function setTheme(theme: Theme): void {
  document.documentElement.dataset.theme = theme;
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch {
    // storage blocked: the theme still applies for this page view
  }
  window.dispatchEvent(new CustomEvent<Theme>(THEME_EVENT, { detail: theme }));
}
