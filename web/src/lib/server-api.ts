/**
 * Data loading for server-rendered public pages (the car listings and detail
 * pages). These run on the Next.js server and call the FastAPI backend
 * directly, so search engines get fully rendered pages. Nothing here needs a
 * login — only public endpoints.
 */
import { buildVehicleQuery } from "./vehicle-query";
import type { Inspection, Vehicle, VehicleFilters } from "./types";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000";

export class ApiNotFoundError extends Error {}

/** `revalidate` is how many seconds a response may be reused; 0 means always fetch fresh. */
async function getJson<T>(path: string, revalidate = 20): Promise<T> {
  const response = await fetch(
    `${API_URL}${path}`,
    revalidate === 0 ? { cache: "no-store" } : { next: { revalidate } },
  );
  // 422 means the id wasn't even a valid UUID — to a visitor that's just "not found".
  if (response.status === 404 || response.status === 422) throw new ApiNotFoundError(path);
  if (!response.ok) throw new Error(`The AutoTrust API returned ${response.status} for ${path}`);
  return response.json() as Promise<T>;
}

export function fetchVehicles(filters: VehicleFilters): Promise<Vehicle[]> {
  // Always fresh: a stale list could show a car that has just been sold.
  return getJson<Vehicle[]>(`/vehicles?${buildVehicleQuery(filters)}`, 0);
}

export function fetchVehicle(id: string): Promise<Vehicle> {
  return getJson<Vehicle>(`/vehicles/${encodeURIComponent(id)}`, 0);
}

export function fetchVehicleInspections(id: string): Promise<Inspection[]> {
  return getJson<Inspection[]>(`/vehicles/${encodeURIComponent(id)}/inspections`, 0);
}

export function fetchMakes(): Promise<string[]> {
  return getJson<string[]>("/vehicles/makes", 60);
}

export function fetchModels(make?: string): Promise<string[]> {
  return getJson<string[]>(`/vehicles/models${make ? `?make=${encodeURIComponent(make)}` : ""}`, 60);
}
