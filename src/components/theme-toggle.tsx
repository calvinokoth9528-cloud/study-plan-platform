"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

export function ThemeToggle({ className = "" }: { className?: string }) {
  // `next-themes` stores "system"/"light"/"dark"; the icon follows the resolved value.
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    function hydrate() {
      setMounted(true);
    }
    const id = window.requestAnimationFrame(hydrate);
    return () => window.cancelAnimationFrame(id);
  }, []);

  if (!mounted) {
    /* Same box size as the real button so the header doesn't shift after hydration. */
    return <div className={cn("h-9 w-9 rounded-lg border border-border", className)} aria-hidden />;
  }

  const isDark = resolvedTheme === "dark";
  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
      className={cn(
        "inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-surface text-text-primary transition-colors hover:bg-bg-tertiary",
        className
      )}
    >
      {isDark ? "☀️" : "🌙"}
    </button>
  );
}
