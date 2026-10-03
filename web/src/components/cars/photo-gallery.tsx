"use client";

import { useRef, useState } from "react";
import { assetUrl } from "@/lib/assets";
import { cn } from "@/lib/cn";
import type { Vehicle } from "@/lib/types";

/** Photo viewer: swipe on phones (native scroll-snap), arrows and thumbnails
 * on larger screens. */
export function PhotoGallery({ vehicle }: { vehicle: Vehicle }) {
  const photos = vehicle.photos;
  const trackRef = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const alt = `${vehicle.year} ${vehicle.make} ${vehicle.model}`;

  function goTo(i: number) {
    const track = trackRef.current;
    if (!track) return;
    const clamped = Math.max(0, Math.min(photos.length - 1, i));
    track.scrollTo({ left: clamped * track.clientWidth, behavior: "smooth" });
    setIndex(clamped);
  }

  if (photos.length === 0) {
    return (
      <div className="flex aspect-[4/3] items-center justify-center rounded-3xl bg-gradient-to-br from-brand-800 to-brand-950 sm:aspect-[16/10]">
        <div className="text-center text-white/90">
          <p className="text-7xl font-black tracking-tight">
            {vehicle.make[0]}
            {vehicle.model[0]}
          </p>
          <p className="mt-2 text-sm text-brand-200">No photos yet</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="group relative overflow-hidden rounded-3xl bg-ink-100">
        <div
          ref={trackRef}
          onScroll={(e) => {
            const el = e.currentTarget;
            setIndex(Math.round(el.scrollLeft / el.clientWidth));
          }}
          className="no-scrollbar flex snap-x snap-mandatory overflow-x-auto"
        >
          {photos.map((p, i) => (
            <div key={p.id} className="aspect-[4/3] w-full flex-shrink-0 snap-center sm:aspect-[16/10]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={assetUrl(p.url)}
                alt={`${alt} — photo ${i + 1}`}
                loading={i === 0 ? "eager" : "lazy"}
                className="h-full w-full object-cover"
              />
            </div>
          ))}
        </div>

        {photos.length > 1 && (
          <>
            <span className="absolute bottom-3 right-3 rounded-full bg-ink-950/70 px-3 py-1 text-xs font-semibold text-white backdrop-blur">
              {index + 1} / {photos.length}
            </span>
            <button
              onClick={() => goTo(index - 1)}
              aria-label="Previous photo"
              disabled={index === 0}
              className="absolute left-3 top-1/2 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-ink-800 shadow-lg backdrop-blur transition hover:bg-white disabled:opacity-0 sm:flex sm:opacity-0 sm:group-hover:opacity-100"
            >
              ‹
            </button>
            <button
              onClick={() => goTo(index + 1)}
              aria-label="Next photo"
              disabled={index === photos.length - 1}
              className="absolute right-3 top-1/2 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-ink-800 shadow-lg backdrop-blur transition hover:bg-white disabled:opacity-0 sm:flex sm:opacity-0 sm:group-hover:opacity-100"
            >
              ›
            </button>
          </>
        )}
      </div>

      {photos.length > 1 && (
        <div className="no-scrollbar mt-3 flex gap-2 overflow-x-auto pb-1">
          {photos.map((p, i) => (
            <button
              key={p.id}
              onClick={() => goTo(i)}
              aria-label={`Show photo ${i + 1}`}
              aria-current={i === index}
              className={cn(
                "h-16 w-24 flex-shrink-0 overflow-hidden rounded-xl ring-2 ring-offset-2 transition",
                i === index ? "ring-brand-600" : "opacity-70 ring-transparent hover:opacity-100",
              )}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={assetUrl(p.thumb_url)} alt="" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
