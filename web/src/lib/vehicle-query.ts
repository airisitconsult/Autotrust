import type { VehicleFilters } from "./types";

/** Turn filters into a query string for the vehicles API. Skips empty values
 * and repeats array values (features) as repeated keys. */
export function buildVehicleQuery(filters: VehicleFilters): string {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") return;
    if (Array.isArray(value)) value.forEach((v) => params.append(key, String(v)));
    else params.append(key, String(value));
  });
  return params.toString();
}
