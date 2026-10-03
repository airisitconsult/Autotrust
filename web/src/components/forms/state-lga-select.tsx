"use client";

import { useQuery } from "@tanstack/react-query";
import { Field, Select } from "@/components/ui/fields";
import { getStatesLgas } from "@/lib/api";
import { cn } from "@/lib/cn";

/** Two dependent dropdowns: picking a state repopulates the LGA list and
 * clears any LGA that no longer belongs to it. The state→LGA data is fetched
 * once from the backend (the single source of truth), never copied into the
 * frontend. Used by the listing form and the car search filters. */
export function StateLgaSelect({
  state,
  lga,
  onChange,
  allowEmpty = false,
  stacked = false,
  idPrefix = "",
  className,
}: {
  state: string;
  lga: string;
  onChange: (next: { state: string; lga: string }) => void;
  allowEmpty?: boolean;
  /** One column at every width (for narrow sidebars). */
  stacked?: boolean;
  /** Keeps element ids unique when the same fields appear twice on a page. */
  idPrefix?: string;
  className?: string;
}) {
  const { data: statesLgas, isLoading } = useQuery({
    queryKey: ["states-lgas"],
    queryFn: getStatesLgas,
    staleTime: Infinity,
  });

  const states = statesLgas ? Object.keys(statesLgas).sort() : [];
  const lgas = statesLgas && state ? (statesLgas[state] ?? []) : [];

  return (
    <div className={cn("grid grid-cols-1 gap-3", !stacked && "sm:grid-cols-2", className)}>
      <Field label="State" htmlFor={`${idPrefix}state`}>
        <Select
          id={`${idPrefix}state`}
          value={state}
          onChange={(e) => onChange({ state: e.target.value, lga: "" })}
          disabled={isLoading}
          required={!allowEmpty}
        >
          <option value="">{isLoading ? "Loading…" : allowEmpty ? "Any state" : "Select state"}</option>
          {states.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="LGA" htmlFor={`${idPrefix}lga`}>
        <Select
          id={`${idPrefix}lga`}
          value={lga}
          onChange={(e) => onChange({ state, lga: e.target.value })}
          disabled={!state}
          required={!allowEmpty}
        >
          <option value="">{state ? (allowEmpty ? "Any LGA" : "Select LGA") : "Select a state first"}</option>
          {lgas.map((l) => (
            <option key={l} value={l}>
              {l}
            </option>
          ))}
        </Select>
      </Field>
    </div>
  );
}
