"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";
import { hasSpin, type Vehicle } from "@/lib/types";
import { PhotoGallery } from "./photo-gallery";
import { SpinViewer } from "./spin-viewer";

/** Photos by default, with a switch to the 360° view when the car has one. */
export function MediaViewer({ vehicle }: { vehicle: Vehicle }) {
  const spinAvailable = hasSpin(vehicle);
  const [mode, setMode] = useState<"photos" | "spin">("photos");
  const name = `${vehicle.year} ${vehicle.make} ${vehicle.model}`;

  return (
    <div>
      {spinAvailable && (
        <div role="tablist" aria-label="View" className="mb-3 inline-flex rounded-xl bg-ink-100 p-1">
          {(
            [
              ["photos", `Photos (${vehicle.photos.length})`],
              ["spin", "360° view"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              role="tab"
              aria-selected={mode === value}
              onClick={() => setMode(value)}
              className={cn(
                "h-9 rounded-lg px-4 text-sm font-semibold transition",
                mode === value ? "bg-white text-brand-700 shadow-sm" : "text-ink-500 hover:text-ink-900",
              )}
            >
              {label}
            </button>
          ))}
        </div>
      )}
      {mode === "spin" && spinAvailable ? (
        <SpinViewer frames={vehicle.spin} alt={name} />
      ) : (
        <PhotoGallery vehicle={vehicle} />
      )}
    </div>
  );
}
