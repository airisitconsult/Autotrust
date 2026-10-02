import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { listAvailableMakes, listAvailableModels } from "../api/vehicles";
import { StateLgaSelect } from "./StateLgaSelect";
import type { VehicleCondition, VehicleFilters } from "../types";

const CONDITIONS: VehicleCondition[] = ["excellent", "good", "fair", "poor"];

export function SearchFilters({
  value,
  onChange,
}: {
  value: VehicleFilters;
  onChange: (next: VehicleFilters) => void;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(value);

  const { data: makes } = useQuery({
    queryKey: ["vehicle-makes"],
    queryFn: listAvailableMakes,
  });

  const { data: models } = useQuery({
    queryKey: ["vehicle-models", draft.make ?? null],
    queryFn: () => listAvailableModels(draft.make),
  });

  function apply(next: VehicleFilters = draft) {
    onChange({ ...next, offset: 0 });
    setOpen(false);
  }

  function reset() {
    const cleared: VehicleFilters = { limit: value.limit };
    setDraft(cleared);
    onChange(cleared);
    setOpen(false);
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-center gap-3">
        <select
          value={draft.make ?? ""}
          onChange={(e) => {
            // Changing brand invalidates the chosen model (it may not belong
            // to the new brand), so clear it.
            const next = { ...draft, make: e.target.value || undefined, model: undefined };
            setDraft(next);
            apply(next);
          }}
          className="min-w-0 flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
        >
          <option value="">All brands</option>
          {makes?.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
        <select
          value={draft.model ?? ""}
          onChange={(e) => {
            const next = { ...draft, model: e.target.value || undefined };
            setDraft(next);
            apply(next);
          }}
          className="min-w-0 flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
        >
          <option value="">All models</option>
          {models?.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
        <button
          onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
        >
          Filters
          <svg
            className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>

      {open && (
        <div className="mt-4 grid grid-cols-2 gap-3 border-t border-slate-100 pt-4 sm:grid-cols-3 lg:grid-cols-6">
          <div>
            <label className="text-xs font-medium text-slate-500">Min price</label>
            <input
              type="number"
              value={draft.min_price ?? ""}
              onChange={(e) =>
                setDraft({ ...draft, min_price: e.target.value ? Number(e.target.value) : undefined })
              }
              className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500">Max price</label>
            <input
              type="number"
              value={draft.max_price ?? ""}
              onChange={(e) =>
                setDraft({ ...draft, max_price: e.target.value ? Number(e.target.value) : undefined })
              }
              className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500">Min year</label>
            <input
              type="number"
              value={draft.min_year ?? ""}
              onChange={(e) =>
                setDraft({ ...draft, min_year: e.target.value ? Number(e.target.value) : undefined })
              }
              className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500">Max year</label>
            <input
              type="number"
              value={draft.max_year ?? ""}
              onChange={(e) =>
                setDraft({ ...draft, max_year: e.target.value ? Number(e.target.value) : undefined })
              }
              className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500">Condition</label>
            <select
              value={draft.condition ?? ""}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  condition: (e.target.value || undefined) as VehicleCondition | undefined,
                })
              }
              className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
            >
              <option value="">Any</option>
              {CONDITIONS.map((c) => (
                <option key={c} value={c}>
                  {c[0].toUpperCase() + c.slice(1)}
                </option>
              ))}
            </select>
          </div>
          <div className="col-span-2 sm:col-span-3 lg:col-span-2">
            <StateLgaSelect
              state={draft.state ?? ""}
              lga={draft.lga ?? ""}
              onStateChange={(v) => setDraft((d) => ({ ...d, state: v || undefined, lga: undefined }))}
              onLgaChange={(v) => setDraft((d) => ({ ...d, lga: v || undefined }))}
              allowEmpty
            />
          </div>
          <div className="col-span-2 flex items-center gap-2 sm:col-span-3 lg:col-span-2">
            <input
              id="vetted-only"
              type="checkbox"
              checked={draft.is_vetted ?? false}
              onChange={(e) => setDraft({ ...draft, is_vetted: e.target.checked || undefined })}
              className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
            />
            <label htmlFor="vetted-only" className="text-sm text-slate-700">
              AutoTrust Vetted only
            </label>
          </div>
          <div className="col-span-2 flex items-end gap-2 sm:col-span-3 lg:col-span-4 lg:justify-end">
            <button
              onClick={reset}
              className="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-500 hover:bg-slate-50"
            >
              Clear all
            </button>
            <button
              onClick={() => apply()}
              className="rounded-lg bg-brand-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-brand-700"
            >
              Apply filters
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
