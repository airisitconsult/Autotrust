import { buildVehicleQuery } from "./vehicle-query";
import {
  BODY_TYPES,
  VEHICLE_FEATURES,
  type BodyType,
  type VehicleCondition,
  type VehicleFeature,
  type VehicleFilters,
} from "./types";

export const PAGE_SIZE = 12;

export type CarView = "list" | "grid";

const CONDITIONS: VehicleCondition[] = ["excellent", "good", "fair", "poor"];

type SearchParams = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function positiveNumber(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

/** Read the filters and page number out of the URL's query string. Anything
 * invalid is ignored rather than passed to the API. */
export function parseCarFilters(
  params: SearchParams,
): { filters: VehicleFilters; page: number; view: CarView } {
  const condition = first(params.condition) as VehicleCondition | undefined;
  const rawFeatures = params.features === undefined ? [] : [params.features].flat();
  const features = rawFeatures.filter((f): f is VehicleFeature =>
    (VEHICLE_FEATURES as readonly string[]).includes(f as string),
  );
  const page = Math.floor(positiveNumber(first(params.page)) ?? 1);
  const bodyType = first(params.body_type) as BodyType | undefined;

  return {
    page,
    // Browsing as a list is the default; the grid is opt-in.
    view: first(params.view) === "grid" ? "grid" : "list",
    filters: {
      make: first(params.make) || undefined,
      model: first(params.model) || undefined,
      min_price: positiveNumber(first(params.min_price)),
      max_price: positiveNumber(first(params.max_price)),
      min_year: positiveNumber(first(params.min_year)),
      max_year: positiveNumber(first(params.max_year)),
      condition: condition && CONDITIONS.includes(condition) ? condition : undefined,
      body_type: bodyType && (BODY_TYPES as readonly string[]).includes(bodyType) ? bodyType : undefined,
      state: first(params.state) || undefined,
      lga: first(params.lga) || undefined,
      is_vetted: first(params.is_vetted) === "true" ? true : undefined,
      features: features.length > 0 ? features : undefined,
    },
  };
}

/** The URL for a set of filters (and optionally a page). */
export function carsHref(filters: VehicleFilters, page = 1, view: CarView = "list"): string {
  const parts = [buildVehicleQuery({ ...filters, offset: undefined, limit: undefined })];
  if (page > 1) parts.push(`page=${page}`);
  if (view === "grid") parts.push("view=grid");
  const qs = parts.filter(Boolean).join("&");
  return qs ? `/cars?${qs}` : "/cars";
}

/** How many filters are active (for the "Filters (3)" button). */
export function activeFilterCount(filters: VehicleFilters): number {
  return Object.entries(filters).filter(([key, value]) => {
    if (key === "offset" || key === "limit") return false;
    if (Array.isArray(value)) return value.length > 0;
    return value !== undefined && value !== "";
  }).length;
}
