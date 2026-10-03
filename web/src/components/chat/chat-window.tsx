"use client";

import Link from "next/link";
import { useEffect, useRef, type FormEvent } from "react";
import { VehicleCard } from "@/components/cars/vehicle-card";
import { useAdvisorChat, type Turn } from "@/context/advisor-chat";
import { formatPrice, titleCase } from "@/lib/format";
import type { AdvisorFilters } from "@/lib/types";

const MAX_LENGTH = 500;

const GREETING =
  "Hi! I'm AutoTrust's car assistant. Tell me what you need — budget, how you'll use the car, who rides with you — and I'll help you find the right one.";

const STARTERS = [
  "A reliable family car for Lagos traffic that's cheap to maintain",
  "Something tough for bad roads",
  "First car, fuel-efficient, nothing older than 2015",
];

function filterChips(f: AdvisorFilters): string[] {
  const chips: string[] = [];
  if (f.min_price != null && f.max_price != null)
    chips.push(`${formatPrice(f.min_price)} – ${formatPrice(f.max_price)}`);
  else if (f.max_price != null) chips.push(`Up to ${formatPrice(f.max_price)}`);
  else if (f.min_price != null) chips.push(`From ${formatPrice(f.min_price)}`);
  if (f.min_year != null && f.max_year != null) chips.push(`${f.min_year}–${f.max_year}`);
  else if (f.min_year != null) chips.push(`${f.min_year} or newer`);
  else if (f.max_year != null) chips.push(`${f.max_year} or older`);
  if (f.condition) chips.push(`${titleCase(f.condition)} condition`);
  if (f.state) chips.push(f.state);
  f.features.forEach((x) => chips.push(titleCase(x)));
  return chips;
}

export function SparkIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 2l1.8 5.2L19 9l-5.2 1.8L12 16l-1.8-5.2L5 9l5.2-1.8L12 2zm7 11l.9 2.6L22.5 16.5l-2.6.9L19 20l-.9-2.6-2.6-.9 2.6-.9L19 13zM5 14l.7 2.3L8 17l-2.3.7L5 20l-.7-2.3L2 17l2.3-.7L5 14z" />
    </svg>
  );
}

function Avatar() {
  return (
    <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-sm">
      <SparkIcon className="h-4 w-4" />
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex items-end gap-2" aria-label="Assistant is typing" role="status">
      <Avatar />
      <div className="flex gap-1 rounded-2xl rounded-bl-md bg-white px-4 py-3.5 shadow-sm ring-1 ring-ink-200">
        {[0, 150, 300].map((delay) => (
          <span
            key={delay}
            className="h-2 w-2 animate-bounce rounded-full bg-ink-300"
            style={{ animationDelay: `${delay}ms` }}
          />
        ))}
      </div>
    </div>
  );
}

function AssistantTurn({
  turn,
  onNavigate,
}: {
  turn: Extract<Turn, { role: "assistant" }>;
  onNavigate?: () => void;
}) {
  const result = turn.result;
  const unavailable = result !== null && !result.ai_available;
  const chips = result?.searched ? filterChips(result.filters) : [];

  return (
    <div className="flex items-start gap-2">
      <Avatar />
      <div className="min-w-0 flex-1">
        <div
          className={`max-w-[95%] whitespace-pre-line rounded-2xl rounded-tl-md px-4 py-2.5 text-sm leading-relaxed shadow-sm ring-1 ${
            unavailable
              ? "bg-gold-100 text-gold-700 ring-gold-400/40"
              : "bg-white text-ink-800 ring-ink-200"
          }`}
        >
          {unavailable ? (
            <>
              I can&apos;t give advice right now. You can still find a car with the search filters —{" "}
              <Link href="/cars" onClick={onNavigate} className="font-semibold underline">
                browse all cars
              </Link>
              .
            </>
          ) : (
            turn.content
          )}
        </div>

        {result && result.ai_available && result.suggested_models.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            {result.suggested_models.map((s) => (
              <div
                key={`${s.make}-${s.model}`}
                title={s.reason}
                className="rounded-xl border border-ink-200 bg-white px-3 py-2 text-xs"
              >
                <span className="font-semibold text-ink-900">
                  {s.make} {s.model}
                </span>
                <span className={`ml-2 font-medium ${s.listings > 0 ? "text-trust-600" : "text-ink-400"}`}>
                  {s.listings > 0 ? `${s.listings} listed` : "none listed"}
                </span>
                {s.reason && <p className="mt-0.5 text-ink-500">{s.reason}</p>}
              </div>
            ))}
          </div>
        )}

        {result?.searched && result.ai_available && (
          <div className="mt-3">
            {chips.length > 0 && (
              <div className="mb-2 flex flex-wrap items-center gap-1.5">
                <span className="text-xs text-ink-500">Searched for:</span>
                {chips.map((c) => (
                  <span key={c} className="rounded-md bg-ink-100 px-2 py-0.5 text-xs text-ink-600">
                    {c}
                  </span>
                ))}
              </div>
            )}
            {result.relaxed && (
              <p className="mb-2 rounded-lg bg-gold-100 p-2.5 text-xs text-gold-700">
                Nothing matched every preference, so I widened the search (budget and years kept).
              </p>
            )}
            {result.vehicles.length === 0 ? (
              <p className="rounded-xl border border-dashed border-ink-300 p-4 text-sm text-ink-500">
                No listings match yet.{" "}
                <Link href="/cars" onClick={onNavigate} className="font-semibold text-brand-600 hover:underline">
                  Browse all cars
                </Link>
              </p>
            ) : (
              <div
                className="no-scrollbar -mx-1 flex snap-x gap-3 overflow-x-auto px-1 pb-2"
                onClickCapture={onNavigate}
              >
                {result.vehicles.map(({ vehicle, recommended }) => (
                  <div key={vehicle.id} className="w-56 flex-shrink-0 snap-start sm:w-60">
                    <VehicleCard vehicle={vehicle} highlight={recommended ? "Recommended" : undefined} />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {result?.ai_available && (
          <p className="mt-2 text-[11px] text-ink-400">
            AI guidance, not a guarantee. Prices, condition and availability come from real listings.
          </p>
        )}
      </div>
    </div>
  );
}

/** The conversation itself: messages, typing indicator and the input box. It
 * fills whatever box it is placed in (the floating window or the full page).
 * `onNavigate` lets the container react when a car or link is chosen (e.g.
 * the phone full-screen window closes so the page underneath is visible). */
export function ChatWindow({ onNavigate }: { onNavigate?: () => void }) {
  const { turns, pending, error, draft, setDraft, send } = useAdvisorChat();
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [turns, pending]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    send(draft);
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4" aria-live="polite">
        <div className="flex flex-col gap-4">
          <div className="flex items-start gap-2">
            <Avatar />
            <div className="max-w-[95%] rounded-2xl rounded-tl-md bg-white px-4 py-2.5 text-sm leading-relaxed text-ink-800 shadow-sm ring-1 ring-ink-200">
              {GREETING}
            </div>
          </div>

          {turns.length === 0 && (
            <div className="ml-10 flex flex-wrap gap-2">
              {STARTERS.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="rounded-full border border-brand-200 bg-white px-3 py-1.5 text-left text-xs font-medium text-brand-700 transition hover:bg-brand-50"
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          {turns.map((turn, i) =>
            turn.role === "user" ? (
              <div
                key={i}
                className="ml-auto max-w-[85%] whitespace-pre-line rounded-2xl rounded-br-md bg-brand-600 px-4 py-2.5 text-sm leading-relaxed text-white shadow-sm"
              >
                {turn.content}
              </div>
            ) : (
              <AssistantTurn key={i} turn={turn} onNavigate={onNavigate} />
            ),
          )}

          {pending && <TypingIndicator />}
        </div>
      </div>

      <div className="border-t border-ink-200 bg-white px-3 py-3">
        {error && (
          <p role="alert" className="mb-2 rounded-lg bg-red-50 p-2.5 text-sm text-red-700">
            {error}
          </p>
        )}
        <form onSubmit={handleSubmit} className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send(draft);
              }
            }}
            maxLength={MAX_LENGTH}
            rows={1}
            placeholder="Type your message…"
            aria-label="Message the car assistant"
            className="max-h-28 min-h-[2.75rem] flex-1 resize-none rounded-2xl border border-ink-200 bg-ink-50 px-4 py-2.5 text-sm focus:border-brand-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-brand-100"
          />
          <button
            type="submit"
            disabled={!draft.trim() || pending}
            aria-label="Send message"
            className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-brand-600 text-white transition hover:bg-brand-700 disabled:opacity-40"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
              <path d="M3.4 20.4l17.5-7.5a1 1 0 000-1.8L3.4 3.6a1 1 0 00-1.4 1.2L4 11l9 1-9 1-2 6.2a1 1 0 001.4 1.2z" />
            </svg>
          </button>
        </form>
      </div>
    </div>
  );
}
