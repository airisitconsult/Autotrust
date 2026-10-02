import { useQuery } from "@tanstack/react-query";
import { getStatesLgas } from "../api/reference";

/** Two dependent dropdowns: picking a state repopulates the LGA list and
 * clears any LGA that no longer belongs to it. Shared by the listing form
 * and the marketplace search filters so the state→LGA data (fetched once
 * from the backend, not duplicated in frontend code) is used consistently.
 */
export function StateLgaSelect({
  state,
  lga,
  onStateChange,
  onLgaChange,
  allowEmpty = false,
  className = "",
}: {
  state: string;
  lga: string;
  onStateChange: (state: string) => void;
  onLgaChange: (lga: string) => void;
  allowEmpty?: boolean;
  className?: string;
}) {
  const { data: statesLgas, isLoading } = useQuery({
    queryKey: ["states-lgas"],
    queryFn: getStatesLgas,
    staleTime: Infinity,
  });

  const states = statesLgas ? Object.keys(statesLgas).sort() : [];
  const lgas = statesLgas && state ? statesLgas[state] ?? [] : [];

  function handleStateChange(next: string) {
    onStateChange(next);
    onLgaChange("");
  }

  return (
    <div className={`grid grid-cols-2 gap-3 ${className}`}>
      <div>
        <label className="text-sm font-medium text-slate-700">State</label>
        <select
          value={state}
          onChange={(e) => handleStateChange(e.target.value)}
          disabled={isLoading}
          required={!allowEmpty}
          className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100 disabled:bg-slate-50"
        >
          <option value="">{isLoading ? "Loading…" : allowEmpty ? "Any state" : "Select state"}</option>
          {states.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="text-sm font-medium text-slate-700">LGA</label>
        <select
          value={lga}
          onChange={(e) => onLgaChange(e.target.value)}
          disabled={!state}
          required={!allowEmpty}
          className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100 disabled:bg-slate-50 disabled:text-slate-400"
        >
          <option value="">{state ? (allowEmpty ? "Any LGA" : "Select LGA") : "Select a state first"}</option>
          {lgas.map((l) => (
            <option key={l} value={l}>
              {l}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
