import { useEffect, useRef, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { useAdvisorChat, type Turn } from "../context/AdvisorChatContext";
import { featureLabel } from "../types";
import type { AdvisorFilters } from "../types";
import { VehicleCard } from "./VehicleCard";

const MAX_LENGTH = 500;

const GREETING =
  "Hi! I'm AutoTrust's car assistant. Tell me what you need — budget, how you'll use the car, who rides with you — and I'll help you find the right one.";

const STARTERS = [
  "A reliable family car for Lagos traffic that's cheap to maintain",
  "Something tough for bad roads",
  "First car, fuel-efficient, nothing older than 2015",
];

function money(n: number) {
  return `$${n.toLocaleString("en-US")}`;
}

function filterChips(f: AdvisorFilters): string[] {
  const chips: string[] = [];
  if (f.min_price != null && f.max_price != null) chips.push(`${money(f.min_price)} – ${money(f.max_price)}`);
  else if (f.max_price != null) chips.push(`Up to ${money(f.max_price)}`);
  else if (f.min_price != null) chips.push(`From ${money(f.min_price)}`);
  if (f.min_year != null && f.max_year != null) chips.push(`${f.min_year}–${f.max_year}`);
  else if (f.min_year != null) chips.push(`${f.min_year} or newer`);
  else if (f.max_year != null) chips.push(`${f.max_year} or older`);
  if (f.condition) chips.push(`${f.condition[0].toUpperCase()}${f.condition.slice(1)} condition`);
  if (f.state) chips.push(f.state);
  f.features.forEach((x) => chips.push(featureLabel(x)));
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
    <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-brand-600 text-white">
      <SparkIcon className="h-4 w-4" />
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex items-end gap-2" aria-label="Assistant is typing" role="status">
      <Avatar />
      <div className="flex gap-1 rounded-2xl rounded-bl-sm bg-white px-4 py-3 shadow-sm ring-1 ring-slate-200">
        {[0, 150, 300].map((delay) => (
          <span
            key={delay}
            className="h-2 w-2 animate-bounce rounded-full bg-slate-400"
            style={{ animationDelay: `${delay}ms` }}
          />
        ))}
      </div>
    </div>
  );
}

function AssistantTurn({
  turn,
  onCarClick,
}: {
  turn: Extract<Turn, { role: "assistant" }>;
  onCarClick?: () => void;
}) {
  const result = turn.result;
  const unavailable = result !== null && !result.ai_available;
  const chips = result?.searched ? filterChips(result.filters) : [];

  return (
    <div className="flex items-start gap-2">
      <Avatar />
      <div className="min-w-0 flex-1">
        <div
          className={`max-w-[95%] whitespace-pre-line rounded-2xl rounded-tl-sm px-4 py-2.5 text-sm shadow-sm ring-1 ${
            unavailable
              ? "bg-amber-50 text-amber-900 ring-amber-200"
              : "bg-white text-slate-800 ring-slate-200"
          }`}
        >
          {unavailable ? (
            <>
              I can't give advice right now. You can still find a car with the search filters —{" "}
              <Link to="/" onClick={onCarClick} className="font-semibold underline">
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
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs"
              >
                <span className="font-semibold text-slate-900">
                  {s.make} {s.model}
                </span>
                <span className={`ml-2 ${s.listings > 0 ? "text-emerald-600" : "text-slate-400"}`}>
                  {s.listings > 0 ? `${s.listings} listed` : "none listed"}
                </span>
                {s.reason && <p className="mt-0.5 text-slate-500">{s.reason}</p>}
              </div>
            ))}
          </div>
        )}

        {result?.searched && result.ai_available && (
          <div className="mt-3">
            {chips.length > 0 && (
              <div className="mb-2 flex flex-wrap items-center gap-1.5">
                <span className="text-xs text-slate-500">Searched for:</span>
                {chips.map((c) => (
                  <span key={c} className="rounded-md bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                    {c}
                  </span>
                ))}
              </div>
            )}
            {result.relaxed && (
              <p className="mb-2 rounded-lg bg-amber-50 p-2.5 text-xs text-amber-800">
                Nothing matched every preference, so I widened the search (budget and years kept).
              </p>
            )}
            {result.vehicles.length === 0 ? (
              <p className="rounded-xl border border-dashed border-slate-300 p-4 text-sm text-slate-500">
                No listings match yet.{" "}
                <Link to="/" onClick={onCarClick} className="font-semibold text-brand-600 hover:underline">
                  Browse all cars
                </Link>
              </p>
            ) : (
              <div
                className="-mx-1 flex snap-x gap-3 overflow-x-auto px-1 pb-2"
                onClickCapture={onCarClick}
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
          <p className="mt-2 text-[11px] text-slate-400">
            AI guidance, not a guarantee. Prices, condition and availability come from real listings.
          </p>
        )}
      </div>
    </div>
  );
}

/** The conversation itself: messages, typing indicator and the input box. It
 * fills whatever box it is placed in (the floating window or the full page).
 * `onCarClick` lets the container react when a car or link is chosen (e.g. the
 * mobile full-screen window closes so the page underneath is visible). */
export function ChatWindow({ onCarClick }: { onCarClick?: () => void }) {
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
            <div className="max-w-[95%] rounded-2xl rounded-tl-sm bg-white px-4 py-2.5 text-sm text-slate-800 shadow-sm ring-1 ring-slate-200">
              {GREETING}
            </div>
          </div>

          {turns.length === 0 && (
            <div className="ml-10 flex flex-wrap gap-2">
              {STARTERS.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="rounded-full border border-brand-200 bg-white px-3 py-1.5 text-left text-xs font-medium text-brand-700 hover:bg-brand-50"
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
                className="ml-auto max-w-[85%] whitespace-pre-line rounded-2xl rounded-br-sm bg-brand-600 px-4 py-2.5 text-sm text-white"
              >
                {turn.content}
              </div>
            ) : (
              <AssistantTurn key={i} turn={turn} onCarClick={onCarClick} />
            ),
          )}

          {pending && <TypingIndicator />}
        </div>
      </div>

      <div className="border-t border-slate-200 bg-slate-50 px-3 py-3">
        {error && <p className="mb-2 rounded-lg bg-red-50 p-2.5 text-sm text-red-700">{error}</p>}
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
            className="max-h-28 min-h-[2.75rem] flex-1 resize-none rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
          />
          <button
            type="submit"
            disabled={!draft.trim() || pending}
            aria-label="Send message"
            className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-brand-600 text-white hover:bg-brand-700 disabled:opacity-40"
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
