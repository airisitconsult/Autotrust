"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { FeatureChecklist } from "@/components/forms/feature-checklist";
import { StateLgaSelect } from "@/components/forms/state-lga-select";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/fields";
import { Sheet } from "@/components/ui/sheet";
import { activeFilterCount, carsHref, type CarView } from "@/lib/car-filters";
import { cn } from "@/lib/cn";
import { titleCase } from "@/lib/format";
import { BODY_TYPES, BODY_TYPE_LABELS } from "@/lib/types";
import type { VehicleCondition, VehicleFilters } from "@/lib/types";

const CONDITIONS: VehicleCondition[] = ["excellent", "good", "fair", "poor"];

function FilterFields({
  idPrefix,
  draft,
  setDraft,
  makes,
  models,
  applyNow,
}: {
  idPrefix: string;
  draft: VehicleFilters;
  setDraft: (next: VehicleFilters) => void;
  makes: string[];
  models: string[];
  /** Apply immediately (used for dropdowns whose change should refresh the list). */
  applyNow: (next: VehicleFilters) => void;
}) {
  const numberField = (key: "min_price" | "max_price" | "min_year" | "max_year") => ({
    inputMode: "numeric" as const,
    value: draft[key] ?? "",
    onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
      setDraft({ ...draft, [key]: e.target.value ? Number(e.target.value) : undefined }),
  });

  return (
    <div className="space-y-5">
      <label className="flex min-h-11 cursor-pointer items-center justify-between gap-3 rounded-2xl bg-trust-50 px-4 py-3 ring-1 ring-trust-200">
        <span>
          <span className="block text-sm font-bold text-trust-800">AutoTrust Vetted only</span>
          <span className="block text-xs text-trust-700">Inspected in person</span>
        </span>
        <input
          type="checkbox"
          checked={draft.is_vetted ?? false}
          onChange={(e) => applyNow({ ...draft, is_vetted: e.target.checked || undefined })}
          className="h-5 w-5 rounded border-trust-300 text-trust-600 focus:ring-trust-500"
        />
      </label>

      <div>
        <p className="mb-1.5 text-sm font-medium text-ink-700">Car type</p>
        <div className="flex flex-wrap gap-2">
          {BODY_TYPES.map((b) => {
            const on = draft.body_type === b;
            return (
              <button
                key={b}
                type="button"
                aria-pressed={on}
                onClick={() => applyNow({ ...draft, body_type: on ? undefined : b })}
                className={cn(
                  "min-h-10 rounded-full border px-3.5 text-sm font-medium transition",
                  on
                    ? "border-brand-600 bg-brand-600 text-white"
                    : "border-ink-200 bg-white text-ink-700 hover:border-brand-300 hover:bg-brand-50",
                )}
              >
                {BODY_TYPE_LABELS[b]}
              </button>
            );
          })}
        </div>
      </div>

      <Field label="Brand" htmlFor={`${idPrefix}make`}>
        <Select
          id={`${idPrefix}make`}
          value={draft.make ?? ""}
          onChange={(e) => applyNow({ ...draft, make: e.target.value || undefined, model: undefined })}
        >
          <option value="">All brands</option>
          {makes.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </Select>
      </Field>

      <Field label="Model" htmlFor={`${idPrefix}model`}>
        <Select
          id={`${idPrefix}model`}
          value={draft.model ?? ""}
          onChange={(e) => applyNow({ ...draft, model: e.target.value || undefined })}
        >
          <option value="">All models</option>
          {models.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </Select>
      </Field>

      <div>
        <p className="mb-1.5 text-sm font-medium text-ink-700">Price (USD)</p>
        <div className="grid grid-cols-2 gap-2">
          <Input type="number" min={0} placeholder="Min" aria-label="Minimum price" {...numberField("min_price")} />
          <Input type="number" min={0} placeholder="Max" aria-label="Maximum price" {...numberField("max_price")} />
        </div>
      </div>

      <div>
        <p className="mb-1.5 text-sm font-medium text-ink-700">Year</p>
        <div className="grid grid-cols-2 gap-2">
          <Input type="number" min={1980} placeholder="From" aria-label="Earliest year" {...numberField("min_year")} />
          <Input type="number" min={1980} placeholder="To" aria-label="Latest year" {...numberField("max_year")} />
        </div>
      </div>

      <div>
        <p className="mb-1.5 text-sm font-medium text-ink-700">Condition</p>
        <div className="flex flex-wrap gap-2">
          {CONDITIONS.map((c) => {
            const on = draft.condition === c;
            return (
              <button
                key={c}
                type="button"
                aria-pressed={on}
                onClick={() => applyNow({ ...draft, condition: on ? undefined : c })}
                className={cn(
                  "min-h-10 rounded-full border px-4 text-sm font-medium transition",
                  on
                    ? "border-brand-600 bg-brand-600 text-white"
                    : "border-ink-200 bg-white text-ink-700 hover:border-brand-300 hover:bg-brand-50",
                )}
              >
                {titleCase(c)}
              </button>
            );
          })}
        </div>
      </div>

      <StateLgaSelect
        allowEmpty
        stacked
        idPrefix={idPrefix}
        state={draft.state ?? ""}
        lga={draft.lga ?? ""}
        onChange={({ state, lga }) =>
          applyNow({ ...draft, state: state || undefined, lga: lga || undefined })
        }
      />

      <details className="group rounded-2xl border border-ink-200 bg-white p-3">
        <summary className="flex min-h-9 cursor-pointer list-none items-center justify-between text-sm font-medium text-ink-700">
          Features{draft.features?.length ? ` (${draft.features.length})` : ""}
          <span className="text-ink-400 transition group-open:rotate-180" aria-hidden>
            ▾
          </span>
        </summary>
        <FeatureChecklist
          className="mt-3 !grid-cols-1"
          selected={draft.features ?? []}
          onChange={(features) => setDraft({ ...draft, features: features.length ? features : undefined })}
        />
      </details>
    </div>
  );
}

/** Search filters. On desktop a sidebar; on phones a "Filters" button that
 * opens them in a bottom sheet. Every change is written to the URL, so the
 * page (rendered on the server) stays shareable and back/forward works. */
export function CarFilters({
  initial,
  view,
  makes,
  models,
}: {
  initial: VehicleFilters;
  view: CarView;
  makes: string[];
  models: string[];
}) {
  const router = useRouter();
  const [draft, setDraft] = useState<VehicleFilters>(initial);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function apply(next: VehicleFilters) {
    setDraft(next);
    startTransition(() => router.push(carsHref(next, 1, view)));
  }

  function reset() {
    setDraft({});
    setSheetOpen(false);
    startTransition(() => router.push(carsHref({}, 1, view)));
  }

  const count = activeFilterCount(initial);
  const fieldsFor = (idPrefix: string) => (
    <FilterFields
      idPrefix={idPrefix}
      draft={draft}
      setDraft={setDraft}
      makes={makes}
      models={models}
      applyNow={apply}
    />
  );

  return (
    <>
      {/* Phones and tablets: a button that opens the sheet */}
      <div className="lg:hidden">
        <Button variant="secondary" onClick={() => setSheetOpen(true)} className="w-full justify-between">
          <span className="flex items-center gap-2">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h18l-7 8v6l-4-2v-4L3 5z" />
            </svg>
            Filters
          </span>
          {count > 0 && (
            <span className="rounded-full bg-brand-600 px-2 py-0.5 text-xs font-bold text-white">{count}</span>
          )}
        </Button>
        <Sheet open={sheetOpen} onClose={() => setSheetOpen(false)} title="Filters">
          <div className="flex items-center justify-between border-b border-ink-100 px-5 py-4">
            <h2 className="text-lg font-bold text-ink-950">Filters</h2>
            <button onClick={reset} className="text-sm font-semibold text-brand-600">
              Clear all
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-5 py-5">{fieldsFor("m-")}</div>
          <div className="border-t border-ink-100 p-4">
            <Button
              className="w-full"
              size="lg"
              onClick={() => {
                setSheetOpen(false);
                apply(draft);
              }}
            >
              Show results
            </Button>
          </div>
        </Sheet>
      </div>

      {/* Desktop: sidebar */}
      <aside
        aria-label="Filters"
        className={cn(
          "sticky top-24 hidden max-h-[calc(100vh-7rem)] overflow-y-auto rounded-3xl border border-ink-200/80 bg-white p-5 shadow-card lg:block",
          pending && "opacity-70",
        )}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-bold text-ink-950">Filters</h2>
          {count > 0 && (
            <button onClick={reset} className="text-sm font-semibold text-brand-600 hover:underline">
              Clear all
            </button>
          )}
        </div>
        {fieldsFor("d-")}
        <Button className="mt-5 w-full" onClick={() => apply(draft)}>
          Apply filters
        </Button>
      </aside>
    </>
  );
}
