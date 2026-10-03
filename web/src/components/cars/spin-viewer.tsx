"use client";

import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { assetUrl } from "@/lib/assets";
import type { VehiclePhoto } from "@/lib/types";

/**
 * A 360-degree viewer built from a walk-around set of photos. Drag (or swipe)
 * sideways to turn the car, use the slider or arrow keys, or let it turn on
 * its own. All frames are preloaded first so turning is smooth. Vertical
 * swipes still scroll the page.
 */
export function SpinViewer({ frames, alt }: { frames: VehiclePhoto[]; alt: string }) {
  const urls = frames.map((f) => assetUrl(f.url));
  const count = urls.length;
  const key = urls.join("|");

  const [index, setIndex] = useState(0);
  const [loaded, setLoaded] = useState(0);
  const [auto, setAuto] = useState(true);
  const [dragging, setDragging] = useState(false);
  const drag = useRef<{ x: number; start: number } | null>(null);
  const box = useRef<HTMLDivElement>(null);

  // Load every frame up front.
  useEffect(() => {
    let cancelled = false;
    setLoaded(0);
    setIndex(0);
    urls.forEach((src) => {
      const img = new Image();
      const done = () => !cancelled && setLoaded((n) => n + 1);
      img.onload = done;
      img.onerror = done;
      img.src = src;
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const ready = loaded >= count;

  // Gentle automatic turn until the visitor takes over.
  useEffect(() => {
    if (!auto || !ready || count < 2) return;
    const timer = window.setInterval(() => setIndex((i) => (i + 1) % count), 110);
    return () => window.clearInterval(timer);
  }, [auto, ready, count]);

  const wrap = (n: number) => ((n % count) + count) % count;

  function onPointerDown(e: PointerEvent<HTMLDivElement>) {
    setAuto(false);
    setDragging(true);
    drag.current = { x: e.clientX, start: index };
    e.currentTarget.setPointerCapture(e.pointerId);
  }

  function onPointerMove(e: PointerEvent<HTMLDivElement>) {
    if (!drag.current || !box.current) return;
    // A full drag across the viewer turns the car about one and a half times.
    const perFrame = box.current.clientWidth / (count * 1.5);
    const moved = Math.round((e.clientX - drag.current.x) / perFrame);
    setIndex(wrap(drag.current.start - moved));
  }

  function endDrag() {
    drag.current = null;
    setDragging(false);
  }

  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key === "ArrowLeft") {
      setAuto(false);
      setIndex((i) => wrap(i - 1));
    } else if (e.key === "ArrowRight") {
      setAuto(false);
      setIndex((i) => wrap(i + 1));
    }
  }

  return (
    <div className="overflow-hidden rounded-3xl bg-gradient-to-b from-ink-100 to-ink-200">
      <div
        ref={box}
        role="img"
        aria-label={`${alt} — 360 degree view. Drag or use the arrow keys to turn it.`}
        tabIndex={0}
        onKeyDown={onKeyDown}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        className={`relative aspect-[4/3] select-none sm:aspect-[16/10] ${dragging ? "cursor-grabbing" : "cursor-grab"}`}
        style={{ touchAction: "pan-y" }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={urls[index]}
          alt=""
          draggable={false}
          className="pointer-events-none h-full w-full object-cover"
        />

        {!ready && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-ink-950/55 text-white backdrop-blur-sm">
            <span className="text-sm font-semibold">Loading 360° view…</span>
            <div className="h-1.5 w-40 overflow-hidden rounded-full bg-white/25">
              <div
                className="h-full rounded-full bg-white transition-all"
                style={{ width: `${Math.round((loaded / count) * 100)}%` }}
              />
            </div>
          </div>
        )}

        <span className="absolute left-3 top-3 rounded-full bg-ink-950/75 px-3 py-1 text-xs font-bold text-white backdrop-blur">
          360°
        </span>
        {ready && (
          <span className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-ink-950/65 px-3.5 py-1.5 text-xs font-medium text-white backdrop-blur">
            ← Drag to turn →
          </span>
        )}
      </div>

      <div className="flex items-center gap-3 bg-white px-4 py-3">
        <button
          onClick={() => setAuto((a) => !a)}
          aria-label={auto ? "Stop turning" : "Turn automatically"}
          className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-brand-600 text-white transition hover:bg-brand-700"
        >
          {auto ? (
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
              <path d="M7 5h4v14H7zM13 5h4v14h-4z" />
            </svg>
          ) : (
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
              <path d="M8 5v14l11-7z" />
            </svg>
          )}
        </button>
        <input
          type="range"
          min={0}
          max={count - 1}
          value={index}
          onChange={(e) => {
            setAuto(false);
            setIndex(Number(e.target.value));
          }}
          aria-label="Rotate the car"
          className="h-2 w-full cursor-pointer accent-brand-600"
        />
      </div>
    </div>
  );
}
