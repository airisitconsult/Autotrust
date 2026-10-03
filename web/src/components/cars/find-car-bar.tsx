"use client";

import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { getStatesLgas } from "@/lib/api";
import { BODY_TYPES, BODY_TYPE_LABELS } from "@/lib/types";
import { buildVehicleQuery } from "@/lib/vehicle-query";

const BUDGETS = [3000, 5000, 8000, 12000, 20000, 35000];

const selectClass =
  "h-12 w-full rounded-xl border-0 bg-white/95 px-3.5 text-sm font-medium text-ink-900 shadow-sm focus:outline-none focus:ring-4 focus:ring-brand-400/40";

/** The big "Find your perfect car" panel on the landing page: where, what kind,
 * which brand and how much, then straight to the filtered list. */
export function FindCarBar({ makes }: { makes: string[] }) {
  const router = useRouter();
  const [state, setState] = useState("");
  const [bodyType, setBodyType] = useState("");
  const [make, setMake] = useState("");
  const [maxPrice, setMaxPrice] = useState("");

  const { data: statesLgas } = useQuery({
    queryKey: ["states-lgas"],
    queryFn: getStatesLgas,
    staleTime: Infinity,
  });
  const states = statesLgas ? Object.keys(statesLgas).sort() : [];

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const qs = buildVehicleQuery({
      state: state || undefined,
      body_type: (bodyType || undefined) as never,
      make: make || undefined,
      max_price: maxPrice ? Number(maxPrice) : undefined,
    });
    router.push(qs ? `/cars?${qs}` : "/cars");
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-3xl bg-gradient-to-br from-brand-900 to-brand-950 p-5 text-white shadow-lift ring-1 ring-white/10 sm:p-6"
    >
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h2 className="text-sm font-extrabold uppercase tracking-widest">Find your perfect car</h2>
        <p className="text-sm text-brand-200">Quick, easy and secure.</p>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_1fr_auto]">
        <label className="block">
          <span className="mb-1.5 block text-xs font-semibold text-brand-200">Location</span>
          <select className={selectClass} value={state} onChange={(e) => setState(e.target.value)}>
            <option value="">Anywhere in Nigeria</option>
            {states.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1.5 block text-xs font-semibold text-brand-200">Car type</span>
          <select className={selectClass} value={bodyType} onChange={(e) => setBodyType(e.target.value)}>
            <option value="">All types</option>
            {BODY_TYPES.map((b) => (
              <option key={b} value={b}>
                {BODY_TYPE_LABELS[b]}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1.5 block text-xs font-semibold text-brand-200">Brand</span>
          <select className={selectClass} value={make} onChange={(e) => setMake(e.target.value)}>
            <option value="">All brands</option>
            {makes.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1.5 block text-xs font-semibold text-brand-200">Budget</span>
          <select className={selectClass} value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)}>
            <option value="">Any price</option>
            {BUDGETS.map((b) => (
              <option key={b} value={b}>
                Up to ${b.toLocaleString("en-US")}
              </option>
            ))}
          </select>
        </label>
        <div className="flex items-end sm:col-span-2 lg:col-span-1">
          <Button type="submit" size="lg" className="h-12 w-full !bg-trust-500 hover:!bg-trust-400 lg:w-auto">
            Search cars
          </Button>
        </div>
      </div>
      <p className="mt-4 flex items-center gap-2 text-xs text-brand-200">
        <span aria-hidden className="text-trust-400">
          ✓
        </span>
        Your payment is held by AutoTrust until you confirm you have the car.
      </p>
    </form>
  );
}
