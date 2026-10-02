import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAdvisorChat } from "../context/AdvisorChatContext";
import { ChatWindow, SparkIcon } from "./ChatWindow";

const TEASER_KEY = "autotrust_chat_teaser_seen";

function isPhoneWidth() {
  return window.innerWidth < 640;
}

/** The chatbot: a bubble in the corner of every storefront page that opens a
 * chat window. On phones the window takes the whole screen. Hidden on the
 * full-page chat (/advisor), which shows the same conversation. */
export function AdvisorWidget() {
  const { open, setOpen, reset, turns } = useAdvisorChat();
  const { pathname } = useLocation();
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
    if (open) dismissTeaser();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, setOpen]);

  if (pathname.startsWith("/advisor")) return null;

  return (
    <>
      {open ? (
        <div
          role="dialog"
          aria-label="AutoTrust car assistant"
          className="fixed inset-0 z-50 flex flex-col bg-slate-50 sm:inset-auto sm:bottom-5 sm:right-5 sm:h-[38rem] sm:max-h-[calc(100vh-2.5rem)] sm:w-[26rem] sm:overflow-hidden sm:rounded-2xl sm:shadow-2xl sm:ring-1 sm:ring-slate-200"
        >
          <header className="flex items-center gap-3 bg-brand-600 px-4 py-3 text-white">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20">
              <SparkIcon />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-semibold leading-tight">AutoTrust Assistant</p>
              <p className="text-xs text-brand-100">AI help choosing your next car</p>
            </div>
            {turns.length > 0 && (
              <button
                onClick={reset}
                aria-label="Start a new chat"
                title="New chat"
                className="rounded-lg p-2 text-white/90 hover:bg-white/15"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h5M20 20v-5h-5M5.6 15A8 8 0 0018.4 9M18.4 9A8 8 0 005.6 15" />
                </svg>
              </button>
            )}
            <Link
              to="/advisor"
              onClick={() => setOpen(false)}
              aria-label="Open the chat as a full page"
              title="Open full page"
              className="hidden rounded-lg p-2 text-white/90 hover:bg-white/15 sm:block"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4h4M20 8V4h-4M4 16v4h4M20 16v4h-4" />
              </svg>
            </Link>
            <button
              onClick={() => setOpen(false)}
              aria-label="Close chat"
              className="rounded-lg p-2 text-white/90 hover:bg-white/15"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </header>
          <div className="min-h-0 flex-1">
            <ChatWindow onCarClick={() => isPhoneWidth() && setOpen(false)} />
          </div>
        </div>
      ) : (
        <div className="fixed bottom-5 right-5 z-40 flex flex-col items-end gap-2">
          {teaser && (
            <div className="relative max-w-[15rem] rounded-2xl rounded-br-sm bg-white px-4 py-3 text-sm text-slate-700 shadow-lg ring-1 ring-slate-200">
              <button
                onClick={dismissTeaser}
                aria-label="Dismiss"
                className="absolute -left-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-slate-200 text-xs text-slate-600 hover:bg-slate-300"
              >
                &times;
              </button>
              Not sure which car to buy? I can help you choose.
            </div>
          )}
          <button
            onClick={() => setOpen(true)}
            aria-label="Chat with the AutoTrust AI assistant"
            className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-600 text-white shadow-lg transition hover:scale-105 hover:bg-brand-700 hover:shadow-xl sm:h-auto sm:w-auto sm:gap-2 sm:px-5 sm:py-3.5"
          >
            <SparkIcon className="h-6 w-6 sm:h-5 sm:w-5" />
            <span className="hidden text-sm font-semibold sm:inline">Ask AI</span>
          </button>
        </div>
      )}
    </>
  );
}
