import type { Metadata } from "next";
import Link from "next/link";
import { CarFilters } from "@/components/cars/car-filters";
import { VehicleCard } from "@/components/cars/vehicle-card";
import { VehicleRow } from "@/components/cars/vehicle-row";
import { OpenChatButton } from "@/components/chat/open-chat-button";
import { ButtonLink } from "@/components/ui/button";
import { PAGE_SIZE, carsHref, parseCarFilters, type CarView } from "@/lib/car-filters";
import { cn } from "@/lib/cn";
import { formatPrice, titleCase } from "@/lib/format";
import { fetchMakes, fetchModels, fetchVehicles } from "@/lib/server-api";
import { BODY_TYPE_LABELS, type Vehicle, type VehicleFilters } from "@/lib/types";

export const metadata: Metadata = {
  title: "Browse cars",
  description: "Search inspected and vetted used cars across Nigeria by brand, type, price, year and location.",
};

/** Each active filter as a removable chip (a plain link that drops that filter). */
function activeChips(filters: VehicleFilters, view: CarView): { label: string; href: string }[] {
  const without = (...keys: (keyof VehicleFilters)[]) => {
    const next = { ...filters };
    keys.forEach((k) => delete next[k]);
    return carsHref(next, 1, view);
  };
  const chips: { label: string; href: string }[] = [];
  if (filters.is_vetted) chips.push({ label: "Vetted only", href: without("is_vetted") });
  if (filters.body_type) chips.push({ label: BODY_TYPE_LABELS[filters.body_type], href: without("body_type") });
  if (filters.make) chips.push({ label: filters.make, href: without("make", "model") });
  if (filters.model) chips.push({ label: filters.model, href: without("model") });
  if (filters.min_price) chips.push({ label: `From ${formatPrice(filters.min_price)}`, href: without("min_price") });
  if (filters.max_price) chips.push({ label: `Up to ${formatPrice(filters.max_price)}`, href: without("max_price") });
  if (filters.min_year) chips.push({ label: `${filters.min_year}+`, href: without("min_year") });
  if (filters.max_year) chips.push({ label: `Up to ${filters.max_year}`, href: without("max_year") });
  if (filters.condition) chips.push({ label: titleCase(filters.condition), href: without("condition") });
  if (filters.state) chips.push({ label: filters.state, href: without("state", "lga") });
  if (filters.lga) chips.push({ label: filters.lga, href: without("lga") });
  filters.features?.forEach((f) =>
    chips.push({
      label: titleCase(f),
      href: carsHref({ ...filters, features: filters.features?.filter((x) => x !== f) }, 1, view),
    }),
  );
  return chips;
}

function ViewToggle({ filters, view }: { filters: VehicleFilters; view: CarView }) {
  const options: { value: CarView; label: string; icon: string }[] = [
    { value: "list", label: "List", icon: "M4 6h16M4 12h16M4 18h16" },
    { value: "grid", label: "Grid", icon: "M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z" },
  ];
  return (
    <div role="group" aria-label="Layout" className="inline-flex rounded-xl bg-ink-100 p-1">
      {options.map((o) => (
        <Link
          key={o.value}
          href={carsHref(filters, 1, o.value)}
          aria-current={view === o.value ? "true" : undefined}
          className={cn(
            "inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-sm font-semibold transition",
            view === o.value ? "bg-white text-brand-700 shadow-sm" : "text-ink-500 hover:text-ink-900",
          )}
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={o.icon} />
          </svg>
          {o.label}
        </Link>
      ))}
    </div>
  );
}

export default async function CarsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { filters, page, view } = parseCarFilters(await searchParams);

  // One extra row tells us whether a next page exists (the API has no total).
  const [result, makes, models] = await Promise.all([
    fetchVehicles({ ...filters, limit: PAGE_SIZE + 1, offset: (page - 1) * PAGE_SIZE }).then(
      (rows) => ({ rows, apiDown: false }),
      () => ({ rows: [] as Vehicle[], apiDown: true }),
    ),
    fetchMakes().catch(() => [] as string[]),
    fetchModels(filters.make).catch(() => [] as string[]),
  ]);
  const { rows, apiDown } = result;
  const cars = rows.slice(0, PAGE_SIZE);
  const hasNext = rows.length > PAGE_SIZE;
  const chips = activeChips(filters, view);
  const first = (page - 1) * PAGE_SIZE + 1;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-ink-950">Browse cars</h1>
          <p className="mt-1 text-ink-500">
            {cars.length > 0
              ? `Showing ${first}–${first + cars.length - 1}${hasNext ? "+" : ""} cars`
              : "Inspected and vetted used cars across Nigeria."}
          </p>
        </div>
        <ViewToggle filters={filters} view={view} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[19rem_1fr] lg:gap-8">
        <div>
          <CarFilters key={carsHref(filters)} initial={filters} view={view} makes={makes} models={models} />
        </div>

        <div className="min-w-0">
          {apiDown && (
            <p role="alert" className="mb-5 rounded-2xl bg-gold-50 p-4 text-sm text-ink-800 ring-1 ring-gold-200">
              We couldn&apos;t load the cars right now. Please refresh in a moment.
            </p>
          )}
          {chips.length > 0 && (
            <div className="mb-5 flex flex-wrap items-center gap-2">
              {chips.map((c) => (
                <Link
                  key={c.label}
                  href={c.href}
                  className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-3 py-1.5 text-sm font-medium text-brand-700 ring-1 ring-brand-100 transition hover:bg-brand-100"
                >
                  {c.label}
                  <span aria-hidden className="text-brand-400">
                    ×
                  </span>
                  <span className="sr-only">remove filter</span>
                </Link>
              ))}
              <Link href={carsHref({}, 1, view)} className="px-1 text-sm font-semibold text-ink-500 hover:text-ink-900">
                Clear all
              </Link>
            </div>
          )}

          {cars.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-ink-300 bg-white px-6 py-16 text-center">
              <p className="text-lg font-bold text-ink-900">No cars match these filters</p>
              <p className="mx-auto mt-2 max-w-md text-ink-500">
                Try widening your search, or ask the assistant to suggest something close to what you need.
              </p>
              <div className="mt-6 flex flex-wrap justify-center gap-3">
                <ButtonLink href={carsHref({}, 1, view)} variant="secondary">
                  Clear filters
                </ButtonLink>
                <OpenChatButton size="md">Ask the AI assistant</OpenChatButton>
              </div>
            </div>
          ) : (
            <>
              {view === "list" ? (
                <div className="flex flex-col gap-4">
                  {cars.map((v) => (
                    <VehicleRow key={v.id} vehicle={v} />
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-5 min-[560px]:grid-cols-2 xl:grid-cols-3">
                  {cars.map((v) => (
                    <VehicleCard key={v.id} vehicle={v} />
                  ))}
                </div>
              )}

              {(page > 1 || hasNext) && (
                <nav aria-label="Pagination" className="mt-10 flex items-center justify-between gap-3">
                  {page > 1 ? (
                    <ButtonLink href={carsHref(filters, page - 1, view)} variant="secondary">
                      ← Previous
                    </ButtonLink>
                  ) : (
                    <span />
                  )}
                  <span className="text-sm font-medium text-ink-500">Page {page}</span>
                  {hasNext ? (
                    <ButtonLink href={carsHref(filters, page + 1, view)} variant="secondary">
                      Next →
                    </ButtonLink>
                  ) : (
                    <span />
                  )}
                </nav>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
