"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useAdvisorChat } from "@/context/advisor-chat";
import { ChatWindow, SparkIcon } from "./chat-window";

const TEASER_KEY = "autotrust_chat_teaser_seen";

function isPhoneWidth() {
  return window.innerWidth < 640;
}

/** The chatbot: a bubble in the corner of every storefront page that opens a
 * chat window. On phones the window is a bottom sheet covering half the
 * screen (full width, 50% height), not full screen. Hidden on the
 * full-page chat (/advisor), which shows the same conversation. */
export function AdvisorWidget() {
  const { open, setOpen, reset, turns } = useAdvisorChat();
  const pathname = usePathname();
  const [teaser, setTeaser] = useState(false);

  // A one-time nudge a few seconds after arriving, for first-time visitors.
  useEffect(() => {
    let seen = false;
    try {
      seen = sessionStorage.getItem(TEASER_KEY) === "1";
    } catch {
      // storage unavailable — just show it
    }
    if (seen || open) return;
    const timer = window.setTimeout(() => setTeaser(true), 4000);
    return () => window.clearTimeout(timer);
  }, [open]);

  function dismissTeaser() {
    setTeaser(false);
    try {
      sessionStorage.setItem(TEASER_KEY, "1");
    } catch {
      // ignore
    }
  }

  useEffect(() => {
    if (open) {
      setTeaser(false);
      try {
        sessionStorage.setItem(TEASER_KEY, "1");
      } catch {
        // ignore
      }
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, setOpen]);

  if (pathname.startsWith("/advisor")) return null;
  // Car pages have a fixed price bar along the bottom on phones/tablets; sit above it.
  const aboveBar = /^\/cars\/[^/]+/.test(pathname);

  return (
    <>
      {open ? (
        <div
          role="dialog"
          aria-label="AutoTrustAI car assistant"
          className={`fixed inset-x-0 z-50 flex h-[50dvh] flex-col overflow-hidden rounded-t-2xl bg-ink-50 shadow-2xl ring-1 ring-ink-200 sm:inset-x-auto sm:right-5 sm:h-[38rem] sm:max-h-[calc(100vh-2.5rem)] sm:w-[26rem] sm:rounded-3xl ${aboveBar ? "bottom-20 lg:bottom-5" : "bottom-0 sm:bottom-5"}`}
        >
          <header className="flex items-center gap-2 bg-gradient-to-r from-brand-950 to-brand-800 px-3 py-2.5 text-white sm:gap-3 sm:px-4 sm:py-3.5">
            <div className="hidden h-10 w-10 items-center justify-center rounded-full bg-white/15 ring-1 ring-white/20 sm:flex">
              <SparkIcon />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate font-bold leading-tight">AutoTrustAI</p>
              <p className="truncate text-[11px] text-brand-200 sm:text-xs">Help choosing your next car</p>
            </div>
            {turns.length > 0 && (
              <button
                onClick={reset}
                aria-label="Start a new chat"
                title="New chat"
                className="rounded-lg p-2 text-white/80 transition hover:bg-white/15 hover:text-white"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h5M20 20v-5h-5M5.6 15A8 8 0 0018.4 9M18.4 9A8 8 0 005.6 15" />
                </svg>
              </button>
            )}
            <Link
              href="/advisor"
              onClick={() => setOpen(false)}
              aria-label="Open the chat as a full page"
              title="Open full page"
              className="hidden rounded-lg p-2 text-white/80 transition hover:bg-white/15 hover:text-white sm:block"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4h4M20 8V4h-4M4 16v4h4M20 16v4h-4" />
              </svg>
            </Link>
            <button
              onClick={() => setOpen(false)}
              aria-label="Close chat"
              className="rounded-lg p-2 text-white/80 transition hover:bg-white/15 hover:text-white"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </header>
          <div className="min-h-0 flex-1">
            <ChatWindow onNavigate={() => isPhoneWidth() && setOpen(false)} />
          </div>
        </div>
      ) : (
        <div
          className={`fixed right-5 z-40 flex flex-col items-end gap-2 ${aboveBar ? "bottom-24 lg:bottom-5" : "bottom-5"}`}
        >
          {teaser && (
            <div className="relative max-w-[15rem] rounded-2xl rounded-br-md bg-white px-4 py-3 text-sm text-ink-700 shadow-lift ring-1 ring-ink-200">
              <button
                onClick={dismissTeaser}
                aria-label="Dismiss"
                className="absolute -left-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-ink-200 text-xs text-ink-600 hover:bg-ink-300"
              >
                &times;
              </button>
              Not sure which car to buy? I can help you choose.
            </div>
          )}
          <button
            onClick={() => setOpen(true)}
            aria-label="Chat with AutoTrustAI"
            className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-lift ring-4 ring-white/70 transition hover:scale-105 sm:h-auto sm:w-auto sm:gap-2 sm:px-5 sm:py-3.5"
          >
            <SparkIcon className="h-6 w-6 sm:h-5 sm:w-5" />
            <span className="hidden text-sm font-semibold sm:inline">Ask AutoTrustAI</span>
          </button>
        </div>
      )}
    </>
  );
}
