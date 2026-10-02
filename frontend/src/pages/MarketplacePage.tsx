import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useAdvisorChat } from "../context/AdvisorChatContext";
import { listVehicles } from "../api/vehicles";
import { FullPageSpinner } from "../components/Spinner";
import { SearchFilters } from "../components/SearchFilters";
import { VehicleCard } from "../components/VehicleCard";
import type { VehicleFilters } from "../types";

export function MarketplacePage() {
  const { setOpen: setChatOpen } = useAdvisorChat();
  const [filters, setFilters] = useState<VehicleFilters>({ limit: 24, offset: 0 });

  const { data: vehicles, isLoading, isError } = useQuery({
    queryKey: ["vehicles", filters],
    queryFn: () => listVehicles(filters),
  });

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <section className="mb-8 overflow-hidden rounded-3xl bg-gradient-to-br from-brand-700 via-brand-800 to-slate-900 px-6 py-12 text-white sm:px-10 sm:py-16">
        <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl lg:text-5xl">
          Buy with confidence.
        </h1>
        <p className="mt-3 max-w-xl text-brand-100 sm:text-lg">
          Every AutoTrust Vetted listing has been physically inspected and
          certified. Browse vehicles you can actually trust.
        </p>
        <button
          onClick={() => setChatOpen(true)}
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-brand-700 shadow-lg transition hover:bg-brand-50"
        >
          <span aria-hidden>✨</span> Not sure what to buy? Chat with our AI assistant &rarr;
        </button>
      </section>

      <div className="mb-6">
        <SearchFilters value={filters} onChange={setFilters} />
      </div>

      {isLoading && <FullPageSpinner />}

      {isError && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center text-red-700">
          Couldn't load listings. Is the backend running?
        </div>
      )}

      {vehicles && vehicles.length === 0 && (
        <div className="rounded-xl border border-dashed border-slate-300 p-12 text-center text-slate-500">
          No vehicles match your search. Try widening your filters.
        </div>
      )}

      {vehicles && vehicles.length > 0 && (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {vehicles.map((v) => (
            <VehicleCard key={v.id} vehicle={v} />
          ))}
        </div>
      )}
    </div>
  );
}
