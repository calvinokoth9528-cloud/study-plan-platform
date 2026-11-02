"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui";
import { ThemeToggle } from "@/components/theme-toggle";

const navLinks = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/courses", label: "Courses" },
  { href: "/plans", label: "Plans" },
  { href: "/calendar", label: "Calendar" },
  { href: "/analytics", label: "Analytics" },
];

export function LayoutShell({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const user = session?.user as { name?: string; email?: string } | null;

  return (
    <div className="min-h-screen bg-[var(--bg-secondary)]">
      <nav className="sticky top-0 z-40 border-b border-[var(--border-strong)] bg-[var(--bg-primary)]/95 backdrop-blur supports-[backdrop-filter]:bg-[var(--bg-primary)]/70">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/dashboard" className="flex items-center gap-2">
            <svg className="h-7 w-7 text-[var(--accent)]" viewBox="0 0 32 32" fill="currentColor">
              <rect width="32" height="32" rx="8" fill="currentColor" />
              <path d="M8 8h6l-6 12 6 4-6 12H8" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
              <path d="M24 8h-6l6 12-6 4 6 12" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" opacity="0.85" />
            </svg>
            <span className="text-lg font-bold tracking-wide text-[var(--text-primary)]">Study Plan</span>
          </Link>

          <div className="hidden items-center gap-6 md:flex">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "relative text-sm font-bold transition-colors after:absolute after:bottom-[-3px] after:left-0 afterright-0 after:h-[2px] after:rounded-md after:bg-[var(--accent)] after:opacity-0 hover:text-[var(--accent)] after:transition-opacity",
                  pathname.startsWith(link.href) ? "text-accent" : "text-text-secondary"
                )}
              >
                {link.label}
              </Link>
            ))}
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <ThemeToggle />
            {session ? (
              <>
                <Link href="/profile" className="hidden text-sm font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors sm:block">
                  {user?.name ?? user?.email}
                </Link>
                <Button variant="ghost" size="sm" onClick={() => signOut({ callbackUrl: "/login" })}>
                  Sign out
                </Button>
              </>
            ) : (
              <div className="hidden items-center gap-3 md:flex">
                <Link href="/login">
                  <Button variant="ghost" size="sm">Sign in</Button>
                </Link>
                <Link href="/signup">
                  <Button size="sm">Get started</Button>
                </Link>
              </div>
            )}

            <Button variant="ghost" size="sm" className="md:hidden" onClick={() => setMenuOpen((v) => !v)} aria-label="Open menu">
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                {menuOpen ? (
                  <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
                ) : (
                  <path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round" strokeLinejoin="round" />
                )}
              </svg>
            </Button>
          </div>
        </div>

        {menuOpen && (
          <div ref={menuRef} className="border-t border-[var(--border)] bg-[var(--bg-primary)] md:hidden">
            <div className="flex flex-col gap-1 px-4 py-3">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMenuOpen(false)}
                  className={cn(
                    "rounded-md px-3 py-2 text-sm font-bold transition-colors",
                    pathname.startsWith(link.href) ? "bg-[var(--accent-glow)] text-[var(--accent)]" : "text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]"
                  )}
                >
                  {link.label}
                </Link>
              ))}
              {!session && (
              <div className="mt-2 flex flex-col gap-2 border-t border-[var(--border)] pt-3">
                <ThemeToggle className="self-start" />
                <Link href="/login" className="w-full">
                    <Button variant="secondary" className="w-full">Sign in</Button>
                  </Link>
                  <Link href="/signup" className="w-full">
                    <Button className="w-full">Get started</Button>
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}
      </nav>

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">{children}</main>
    </div>
  );
}

export function DashboardShell({ children }: { children: React.ReactNode }) {
  return <LayoutShell>{children}</LayoutShell>;
}
