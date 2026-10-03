"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";
import { Panel } from "@/components/dashboard/cards";
import { StateLgaSelect } from "@/components/forms/state-lga-select";
import { StatusBadge, VettedBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/fields";
import { Skeleton } from "@/components/ui/spinner";
import { assetUrl } from "@/lib/assets";
import { listAdminVehicles } from "@/lib/api";
import { cn } from "@/lib/cn";
import { formatDate, formatPrice, titleCase } from "@/lib/format";
import {
  BODY_TYPES,
  BODY_TYPE_LABELS,
  type AdminVehicleFilters,
  type BodyType,
  type VehicleStatus,
} from "@/lib/types";

const PAGE_SIZE = 15;

type Draft = {
  state: string;
  lga: string;
  body_type: string;
  make: string;
  model: string;
  min_year: string;
  max_year: string;
  min_price: string;
  max_price: string;
  verified: "" | "true" | "false";
  status: string;
  seller: string;
};

const EMPTY: Draft = {
  state: "", lga: "", body_type: "", make: "", model: "", min_year: "", max_year: "",
  min_price: "", max_price: "", verified: "", status: "", seller: "",
};

function toFilters(scope: "sellers" | "company", d: Draft, page: number): AdminVehicleFilters & { limit: number } {
  const num = (v: string) => (v ? Number(v) : undefined);
  return {
    scope,
    state: d.state || undefined,
    lga: d.lga || undefined,
    body_type: (d.body_type || undefined) as BodyType | undefined,
    make: d.make.trim() || undefined,
    model: d.model.trim() || undefined,
    min_year: num(d.min_year),
    max_year: num(d.max_year),
    min_price: num(d.min_price),
    max_price: num(d.max_price),
    is_vetted: d.verified ? d.verified === "true" : undefined,
    status: (d.status || undefined) as VehicleStatus | undefined,
    seller: scope === "sellers" ? d.seller.trim() || undefined : undefined,
    limit: PAGE_SIZE,
    offset: (page - 1) * PAGE_SIZE,
  };
}

/** The staff view of every listing, with a switch between the sellers' cars and
 * AutoTrust's own, and filters for location, car type, model, year, price,
 * verification and seller. */
export function AdminListings({ canAddCompanyCar }: { canAddCompanyCar: boolean }) {
  const [scope, setScope] = useState<"sellers" | "company">("sellers");
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [applied, setApplied] = useState<Draft>(EMPTY);
  const [page, setPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => setDraft((d) => ({ ...d, [key]: value }));

  const { data, isLoading, isError, isFetching } = useQuery({
    queryKey: ["admin-vehicles", scope, applied, page],
    queryFn: () => listAdminVehicles(toFilters(scope, applied, page)),
    placeholderData: (previous) => previous,
  });

  const activeCount = Object.values(applied).filter(Boolean).length;
  const total = data?.total ?? 0;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  function apply() {
    setApplied(draft);
    setPage(1);
  }
  function reset() {
    setDraft(EMPTY);
    setApplied(EMPTY);
    setPage(1);
  }

  return (
    <div className="space-y-5">
      <Panel className="!p-4 sm:!p-5">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <label htmlFor="scope" className="sr-only">
              Which listings
            </label>
            <Select
              id="scope"
              value={scope}
              onChange={(e) => {
                setScope(e.target.value as "sellers" | "company");
                setPage(1);
              }}
              className="!h-12 min-w-56 !rounded-2xl !bg-accent/15 !pr-10 !text-base !font-bold !text-night-text"
            >
              <option value="sellers">Seller listings</option>
              <option value="company">Company listings</option>
            </Select>
          </div>
          <p className="text-sm text-night-muted">
            {scope === "company" ? "Cars AutoTrust lists itself." : "Cars listed by sellers on the platform."}
          </p>
          <div className="flex-1" />
          <Button variant="secondary" size="sm" onClick={() => setShowFilters((s) => !s)}>
            Filters{activeCount > 0 ? ` (${activeCount})` : ""}
          </Button>
          {scope === "company" && canAddCompanyCar && (
            <Link
              href="/dashboard/listings/new"
              className="inline-flex h-9 items-center rounded-xl bg-accent px-3 text-sm font-semibold text-white hover:bg-brand-400"
            >
              + Add company car
            </Link>
          )}
        </div>

        {showFilters && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              apply();
            }}
            className="mt-5 grid gap-4 border-t border-night-line pt-5 sm:grid-cols-2 lg:grid-cols-4"
          >
            <div className="sm:col-span-2">
              <StateLgaSelect
                allowEmpty
                idPrefix="al-"
                state={draft.state}
                lga={draft.lga}
                onChange={({ state, lga }) => setDraft((d) => ({ ...d, state, lga }))}
              />
            </div>
            <Field label="Car type" htmlFor="al-body">
              <Select id="al-body" value={draft.body_type} onChange={(e) => set("body_type", e.target.value)}>
                <option value="">All types</option>
                {BODY_TYPES.map((b) => (
                  <option key={b} value={b}>
                    {BODY_TYPE_LABELS[b]}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Verification" htmlFor="al-ver">
              <Select id="al-ver" value={draft.verified} onChange={(e) => set("verified", e.target.value as Draft["verified"])}>
                <option value="">Verified and not</option>
                <option value="true">Verified (vetted)</option>
                <option value="false">Not verified</option>
              </Select>
            </Field>
            <Field label="Make" htmlFor="al-make">
              <Input id="al-make" placeholder="Toyota" value={draft.make} onChange={(e) => set("make", e.target.value)} />
            </Field>
            <Field label="Model" htmlFor="al-model">
              <Input id="al-model" placeholder="Camry" value={draft.model} onChange={(e) => set("model", e.target.value)} />
            </Field>
            <Field label="Year from" htmlFor="al-y1">
              <Input id="al-y1" type="number" min={1980} value={draft.min_year} onChange={(e) => set("min_year", e.target.value)} />
            </Field>
            <Field label="Year to" htmlFor="al-y2">
              <Input id="al-y2" type="number" min={1980} value={draft.max_year} onChange={(e) => set("max_year", e.target.value)} />
            </Field>
            <Field label="Price from (USD)" htmlFor="al-p1">
              <Input id="al-p1" type="number" min={0} value={draft.min_price} onChange={(e) => set("min_price", e.target.value)} />
            </Field>
            <Field label="Price to (USD)" htmlFor="al-p2">
              <Input id="al-p2" type="number" min={0} value={draft.max_price} onChange={(e) => set("max_price", e.target.value)} />
            </Field>
            <Field label="Status" htmlFor="al-status">
              <Select id="al-status" value={draft.status} onChange={(e) => set("status", e.target.value)}>
                <option value="">Any status</option>
                {(["draft", "listed", "reserved", "sold"] as const).map((s) => (
                  <option key={s} value={s}>
                    {titleCase(s)}
                  </option>
                ))}
              </Select>
            </Field>
            {scope === "sellers" && (
              <Field label="Seller" htmlFor="al-seller" hint="Part of their email">
                <Input id="al-seller" placeholder="ada.seller" value={draft.seller} onChange={(e) => set("seller", e.target.value)} />
              </Field>
            )}
            <div className="flex items-end gap-2 sm:col-span-2 lg:col-span-4">
              <Button type="submit">Apply filters</Button>
              <Button type="button" variant="ghost" onClick={reset}>
                Clear
              </Button>
            </div>
          </form>
        )}
      </Panel>

      <Panel className={cn("!p-0 overflow-hidden", isFetching && "opacity-80")}>
        <div className="flex items-center justify-between border-b border-night-line px-5 py-4">
          <h2 className="font-bold text-night-text">
            {scope === "company" ? "Company listings" : "Seller listings"}
            <span className="ml-2 text-sm font-medium text-night-muted">{total} found</span>
          </h2>
        </div>

        {isLoading ? (
          <div className="space-y-3 p-5">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-16 !bg-night-700" />
            ))}
          </div>
        ) : isError ? (
          <p className="p-8 text-center text-red-300">Couldn&apos;t load listings.</p>
        ) : !data || data.items.length === 0 ? (
          <p className="p-10 text-center text-sm text-night-muted">No listings match these filters.</p>
        ) : (
          <ul className="divide-y divide-night-line">
            {data.items.map(({ vehicle: v, owner_email }) => {
              const cover = v.photos[0];
              return (
                <li key={v.id}>
                  <Link
                    href={v.status === "draft" ? `/dashboard/listings/${v.id}/edit` : `/cars/${v.id}`}
                    className="flex items-center gap-4 px-5 py-4 transition hover:bg-night-700/40"
                  >
                    <span className="relative hidden h-14 w-20 flex-shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-brand-700 to-night-900 text-sm font-black text-white/80 min-[420px]:flex">
                      {cover ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={assetUrl(cover.thumb_url)} alt="" className="absolute inset-0 h-full w-full object-cover" />
                      ) : (
                        <>
                          {v.make[0]}
                          {v.model[0]}
                        </>
                      )}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold text-night-text">
                        {v.year} {v.make} {v.model}
                        {v.body_type && (
                          <span className="ml-2 text-xs font-medium text-night-muted">{BODY_TYPE_LABELS[v.body_type]}</span>
                        )}
                      </p>
                      <p className="truncate text-xs text-night-muted">
                        {v.lga}, {v.state} · {formatDate(v.created_at)}
                      </p>
                      <p className="truncate text-xs text-night-muted">
                        {scope === "company" ? "AutoTrust" : owner_email}
                      </p>
                    </div>
                    <div className="flex flex-shrink-0 flex-col items-end gap-1.5">
                      <p className="font-bold text-night-text">{formatPrice(v.price)}</p>
                      <div className="flex flex-wrap justify-end gap-1.5">
                        <StatusBadge status={v.status} />
                        {v.is_vetted ? <VettedBadge className="!px-2 !text-[11px]" /> : null}
                      </div>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}

        {pages > 1 && (
          <div className="flex items-center justify-between border-t border-night-line px-5 py-3">
            <Button size="sm" variant="secondary" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              ← Previous
            </Button>
            <span className="text-sm text-night-muted">
              Page {page} of {pages}
            </span>
            <Button size="sm" variant="secondary" disabled={page >= pages} onClick={() => setPage((p) => p + 1)}>
              Next →
            </Button>
          </div>
        )}
      </Panel>
    </div>
  );
}
