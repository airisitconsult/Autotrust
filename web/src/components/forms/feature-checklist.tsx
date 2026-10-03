"use client";

import { cn } from "@/lib/cn";
import { VEHICLE_FEATURES, featureLabel, type VehicleFeature } from "@/lib/types";

export function FeatureChecklist({
  selected,
  onChange,
  className,
}: {
  selected: VehicleFeature[];
  onChange: (next: VehicleFeature[]) => void;
  className?: string;
}) {
  function toggle(feature: VehicleFeature) {
    onChange(selected.includes(feature) ? selected.filter((f) => f !== feature) : [...selected, feature]);
  }

  return (
    <div className={cn("grid grid-cols-1 gap-2 min-[420px]:grid-cols-2 lg:grid-cols-3", className)}>
      {VEHICLE_FEATURES.map((feature) => {
        const checked = selected.includes(feature);
        return (
          <label
            key={feature}
            className={cn(
              "flex min-h-11 cursor-pointer items-center gap-2.5 rounded-xl border px-3 text-sm transition",
              checked
                ? "border-brand-300 bg-brand-50 font-medium text-brand-800 night:border-accent/60 night:bg-accent/10 night:text-night-text"
                : "border-ink-200 text-ink-600 hover:bg-ink-50 night:border-night-line night:text-night-muted night:hover:bg-night-700",
            )}
          >
            <input
              type="checkbox"
              checked={checked}
              onChange={() => toggle(feature)}
              className="h-4 w-4 rounded border-ink-300 text-brand-600 focus:ring-brand-500"
            />
            {featureLabel(feature)}
          </label>
        );
      })}
    </div>
  );
}
