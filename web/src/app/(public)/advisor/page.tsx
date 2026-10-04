"use client";

import { ChatWindow, SparkIcon } from "@/components/chat/chat-window";
import { useAdvisorChat } from "@/context/advisor-chat";

// A client page can't export metadata, so the page title lives in layout.tsx
// next to this file.

/** The same chat as the floating window, full size. */
export default function AdvisorPage() {
  const { turns, reset } = useAdvisorChat();

  return (
    <div className="mx-auto max-w-3xl px-4 pt-6 sm:px-6 sm:pt-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-brand-600">
            <SparkIcon />
            <span className="text-sm font-bold uppercase tracking-wide">AutoTrustAI</span>
          </div>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-ink-950 sm:text-3xl">
            Find the right car, by chatting
          </h1>
        </div>
        {turns.length > 0 && (
          <button
            onClick={reset}
            className="rounded-xl border border-ink-200 bg-white px-3.5 py-2 text-sm font-semibold text-ink-600 transition hover:bg-ink-50"
          >
            New chat
          </button>
        )}
      </div>

      <div className="mt-5 h-[calc(100dvh-14rem)] min-h-[26rem] overflow-hidden rounded-3xl bg-ink-50 shadow-card ring-1 ring-ink-200">
        <ChatWindow />
      </div>
    </div>
  );
}
