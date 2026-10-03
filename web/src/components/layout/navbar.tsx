"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Logo } from "@/components/brand/logo";
import { ButtonLink, Button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/sheet";
import { useAdvisorChat } from "@/context/advisor-chat";
import { useAuth } from "@/context/auth";
import { roleLabel } from "@/lib/access";
import { cn } from "@/lib/cn";

const links = [
  { href: "/cars", label: "Browse cars" },
  { href: "/#how-it-works", label: "How it works" },
];

function SparkIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 2l1.8 5.2L19 9l-5.2 1.8L12 16l-1.8-5.2L5 9l5.2-1.8L12 2zm7 11l.9 2.6L22.5 16.5l-2.6.9L19 20l-.9-2.6-2.6-.9 2.6-.9L19 13z" />
    </svg>
  );
}

export function Navbar() {
  const { user, loading, logout } = useAuth();
  const { setOpen: setChatOpen } = useAdvisorChat();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  function openChat() {
    setMenuOpen(false);
    // The full-page chat (/advisor) already is the chat.
    if (!pathname.startsWith("/advisor")) setChatOpen(true);
  }

  const linkClass = (active: boolean) =>
    cn(
      "rounded-lg px-3 py-2 text-sm font-medium transition",
      active ? "bg-brand-50 text-brand-700" : "text-ink-600 hover:bg-ink-100 hover:text-ink-900",
    );

  return (
    <header className="sticky top-0 z-40 border-b border-ink-200/70 bg-white/85 backdrop-blur-lg">
      <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <Logo />

        <div className="hidden items-center gap-1 md:flex">
          {links.map((l) => (
            <Link key={l.href} href={l.href} className={linkClass(pathname === l.href)}>
              {l.label}
            </Link>
          ))}
          <button onClick={openChat} className={cn(linkClass(false), "inline-flex items-center gap-1.5")}>
            <SparkIcon className="h-4 w-4 text-brand-600" /> AI Assistant
          </button>
        </div>

        <div className="hidden items-center gap-2 md:flex">
          {loading ? (
            <div className="h-10 w-40" />
          ) : user ? (
            <>
              <ButtonLink href="/dashboard/listings/new" variant="secondary" size="sm">
                + List a car
              </ButtonLink>
              <ButtonLink href="/dashboard" size="sm">
                Dashboard
              </ButtonLink>
            </>
          ) : (
            <>
              <ButtonLink href="/login" variant="ghost" size="sm">
                Log in
              </ButtonLink>
              <ButtonLink href="/register" size="sm">
                Sign up
              </ButtonLink>
            </>
          )}
        </div>

        <button
          onClick={() => setMenuOpen(true)}
          aria-label="Open menu"
          className="flex h-11 w-11 items-center justify-center rounded-xl text-ink-700 hover:bg-ink-100 md:hidden"
        >
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7h16M4 12h16M4 17h16" />
          </svg>
        </button>
      </nav>

      <Sheet open={menuOpen} onClose={() => setMenuOpen(false)} title="Menu" side="left">
        <div className="flex items-center justify-between border-b border-ink-100 px-4 py-3">
          <Logo className="h-9" />
          <button
            onClick={() => setMenuOpen(false)}
            aria-label="Close menu"
            className="flex h-10 w-10 items-center justify-center rounded-xl text-ink-600 hover:bg-ink-100"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="flex flex-1 flex-col gap-1 overflow-y-auto p-3">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              onClick={() => setMenuOpen(false)}
              className="rounded-xl px-3 py-3 text-base font-medium text-ink-800 hover:bg-ink-100"
            >
              {l.label}
            </Link>
          ))}
          <button
            onClick={openChat}
            className="flex items-center gap-2 rounded-xl px-3 py-3 text-left text-base font-medium text-ink-800 hover:bg-ink-100"
          >
            <SparkIcon className="h-5 w-5 text-brand-600" /> AI Assistant
          </button>
        </div>
        <div className="border-t border-ink-100 p-4">
          {user ? (
            <div className="space-y-2">
              <p className="truncate text-sm text-ink-600">
                {user.email} · <span className="font-medium">{roleLabel(user.role)}</span>
              </p>
              <ButtonLink href="/dashboard" className="w-full" onClick={() => setMenuOpen(false)}>
                Dashboard
              </ButtonLink>
              <ButtonLink
                href="/dashboard/listings/new"
                variant="secondary"
                className="w-full"
                onClick={() => setMenuOpen(false)}
              >
                + List a car
              </ButtonLink>
              <Button
                variant="ghost"
                className="w-full"
                onClick={() => {
                  logout();
                  setMenuOpen(false);
                }}
              >
                Log out
              </Button>
            </div>
          ) : (
            <div className="flex gap-2">
              <ButtonLink href="/login" variant="secondary" className="flex-1" onClick={() => setMenuOpen(false)}>
                Log in
              </ButtonLink>
              <ButtonLink href="/register" className="flex-1" onClick={() => setMenuOpen(false)}>
                Sign up
              </ButtonLink>
            </div>
          )}
        </div>
      </Sheet>
    </header>
  );
}
