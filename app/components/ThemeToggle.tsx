"use client";

import { useSyncExternalStore } from "react";

type Theme = "light" | "dark";

// The theme lives outside React, in the `.dark` class on <html> that the
// no-flash script in layout sets before paint. useSyncExternalStore reads it
// without a setState-in-effect (which the client's first render would otherwise
// need to sync), and re-renders subscribers when `toggle` flips the class.
const listeners = new Set<() => void>();

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  return () => listeners.delete(onChange);
}

function getSnapshot(): Theme {
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

export default function ThemeToggle() {
  // `getServerSnapshot` returns a constant because the server can't know the
  // theme; useSyncExternalStore re-syncs on the client without a hydration
  // warning, and the icons are CSS-driven so nothing flashes visually.
  const theme = useSyncExternalStore(subscribe, getSnapshot, () => "dark");

  const toggle = () => {
    const isDark = document.documentElement.classList.toggle("dark");
    try {
      localStorage.setItem("theme", isDark ? "dark" : "light");
    } catch {
      // Storage can be unavailable (private mode, blocked cookies); the toggle
      // still works for this session, it just won't persist.
    }
    listeners.forEach((l) => l());
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
      className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full text-zinc-600 transition-colors hover:bg-zinc-200 dark:text-zinc-300 dark:hover:bg-zinc-800"
    >
      {/* Icon visibility is driven by the `.dark` class (set pre-paint by the
          no-flash script), so the correct icon shows on first paint without a
          flash or a hydration mismatch. */}
      <SunIcon className="hidden dark:block" />
      <MoonIcon className="block dark:hidden" />
    </button>
  );
}

function SunIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
    </svg>
  );
}

function MoonIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9z" />
    </svg>
  );
}
