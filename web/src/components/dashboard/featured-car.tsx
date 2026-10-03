"use client";

import Link from "next/link";
import { useState } from "react";
import { Panel } from "@/components/dashboard/cards";
import { Icon } from "@/components/ui/icon";
import { assetUrl } from "@/lib/assets";
import { formatMileage, formatPrice, titleCase } from "@/lib/format";
import { BODY_TYPE_LABELS, type Vehicle } from "@/lib/types";

/** The big "Recent car listings" panel: one car at a time with arrows to move
 * through the rest, six spec tiles beneath it, and a button to open it. */
export function FeaturedCar({
  vehicles,
  title,
  hrefFor,
  cta,
}: {
  vehicles: Vehicle[];
  title: string;
  /** Where "open" goes for a given car (the public page, or the manage page). */
  hrefFor: (v: Vehicle) => string;
  cta: string;
}) {
  const [index, setIndex] = useState(0);

  if (vehicles.length === 0) {
    return (
      <Panel className="flex min-h-80 flex-col items-center justify-center text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-accent/15 text-accent">
          <Icon name="car" className="h-7 w-7" />
        </span>
        <p className="mt-4 font-bold text-night-text">No cars to show yet</p>
        <p className="mt-1 max-w-56 text-sm text-night-muted">Cars will appear here as soon as there are some.</p>
      </Panel>
    );
  }

  const v = vehicles[Math.min(index, vehicles.length - 1)];
  const cover = v.photos[0];
  const name = `${v.year} ${v.make} ${v.model}`;
  const tiles: [string, string][] = [
    ["Year", String(v.year)],
    ["Mileage", formatMileage(v.mileage)],
    ["Condition", titleCase(v.condition)],
    ["Type", v.body_type ? BODY_TYPE_LABELS[v.body_type] : "—"],
    ["Location", v.lga],
    ["Status", v.is_vetted ? "Vetted ✓" : titleCase(v.status)],
  ];

  return (
    <Panel className="flex h-full flex-col">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-base font-bold text-night-text">{title}</h2>
        <div className="flex gap-1.5">
          <button
            onClick={() => setIndex((i) => (i - 1 + vehicles.length) % vehicles.length)}
            aria-label="Previous car"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-night-line text-night-muted transition hover:bg-night-700 hover:text-night-text"
          >
            <Icon name="left" className="h-4 w-4" />
          </button>
          <button
            onClick={() => setIndex((i) => (i + 1) % vehicles.length)}
            aria-label="Next car"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-night-line text-night-muted transition hover:bg-night-700 hover:text-night-text"
          >
            <Icon name="right" className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="relative aspect-[16/10] overflow-hidden rounded-2xl bg-gradient-to-br from-brand-800 to-night-900 ring-1 ring-night-line">
        {cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={assetUrl(cover.url)} alt={name} className="absolute inset-0 h-full w-full object-cover" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-6xl font-black text-white/80">
            {v.make[0]}
            {v.model[0]}
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-night-950/90 via-night-950/10 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-2 p-4">
          <div className="min-w-0">
            <p className="truncate text-lg font-extrabold text-white">{name}</p>
            <p className="text-xs text-white/70">
              {v.lga}, {v.state}
            </p>
          </div>
          <p className="flex-shrink-0 text-lg font-extrabold text-white">{formatPrice(v.price)}</p>
        </div>
        {vehicles.length > 1 && (
          <span className="absolute right-3 top-3 rounded-full bg-night-950/70 px-2.5 py-1 text-xs font-semibold text-white backdrop-blur">
            {Math.min(index, vehicles.length - 1) + 1} / {vehicles.length}
          </span>
        )}
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2.5">
        {tiles.map(([label, value]) => (
          <div key={label} className="rounded-xl border border-night-line bg-night-900 px-3 py-3 text-center">
            <p className="text-[11px] font-medium text-night-muted">{label}</p>
            <p className="mt-0.5 truncate text-sm font-bold text-night-text">{value}</p>
          </div>
        ))}
      </div>

      <Link
        href={hrefFor(v)}
        className="mt-4 flex h-11 items-center justify-center rounded-xl bg-accent text-sm font-semibold text-white shadow-glow transition hover:bg-brand-400"
      >
        {cta}
      </Link>
    </Panel>
  );
}
