import { featureLabel, VEHICLE_FEATURES, type VehicleFeature } from "../types";

export function FeatureChecklist({
  selected,
  onChange,
}: {
  selected: VehicleFeature[];
  onChange: (next: VehicleFeature[]) => void;
}) {
  function toggle(feature: VehicleFeature) {
    if (selected.includes(feature)) {
      onChange(selected.filter((f) => f !== feature));
    } else {
      onChange([...selected, feature]);
    }
  }

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {VEHICLE_FEATURES.map((feature) => {
        const checked = selected.includes(feature);
        return (
          <label
            key={feature}
            className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm transition ${
              checked
                ? "border-brand-300 bg-brand-50 text-brand-800"
                : "border-slate-200 text-slate-600 hover:bg-slate-50"
            }`}
          >
            <input
              type="checkbox"
              checked={checked}
              onChange={() => toggle(feature)}
              className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
            />
            {featureLabel(feature)}
          </label>
        );
      })}
    </div>
  );
}
