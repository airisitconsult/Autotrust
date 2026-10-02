// "admin" is the *major admin* (support staff); "super_admin" is the single
// owner account. See lib/access.ts for the display names and permission checks.
export type UserRole = "buyer" | "seller" | "inspector" | "admin" | "super_admin";

export type Permission = "manage_inspections" | "manage_users";

export interface PermissionInfo {
  value: Permission;
  description: string;
}

export interface User {
  id: string;
  email: string;
  role: UserRole;
  permissions: Permission[];
  created_at: string;
}

export type VehicleCondition = "excellent" | "good" | "fair" | "poor";
export type VehicleStatus = "draft" | "listed" | "sold";

export const VEHICLE_FEATURES = [
  "air_conditioning",
  "power_steering",
  "power_windows",
  "anti_lock_brakes",
  "airbags",
  "bluetooth",
  "navigation_system",
  "backup_camera",
  "parking_sensors",
  "sunroof",
  "leather_seats",
  "heated_seats",
  "cruise_control",
  "alloy_wheels",
  "keyless_entry",
  "four_wheel_drive",
  "usb_charging",
  "third_row_seating",
] as const;

export type VehicleFeature = (typeof VEHICLE_FEATURES)[number];

export function featureLabel(feature: VehicleFeature): string {
  return feature
    .split("_")
    .map((word) => word[0].toUpperCase() + word.slice(1))
    .join(" ");
}

export interface VehiclePhoto {
  id: string;
  /** Large image (detail page). */
  url: string;
  /** Smaller cropped image for cards and thumbnails. */
  thumb_url: string;
}

export interface Vehicle {
  id: string;
  owner_id: string;
  vin: string;
  make: string;
  model: string;
  year: number;
  mileage: number;
  price: number;
  condition: VehicleCondition;
  state: string;
  lga: string;
  description: string;
  status: VehicleStatus;
  is_vetted: boolean;
  features: VehicleFeature[];
  photos: VehiclePhoto[];
  created_at: string;
  updated_at: string;
}

export interface VehicleInput {
  vin: string;
  make: string;
  model: string;
  year: number;
  mileage: number;
  price: number;
  condition: VehicleCondition;
  state: string;
  lga: string;
  description: string;
  features: VehicleFeature[];
}

export interface VehicleFilters {
  make?: string;
  model?: string;
  min_price?: number;
  max_price?: number;
  min_year?: number;
  max_year?: number;
  condition?: VehicleCondition;
  state?: string;
  lga?: string;
  is_vetted?: boolean;
  features?: VehicleFeature[];
  offset?: number;
  limit?: number;
}

export type InspectionStatus = "pending" | "completed";

export interface Inspection {
  id: string;
  vehicle_id: string;
  requested_by_id: string;
  inspector_id: string | null;
  status: InspectionStatus;
  passed: boolean | null;
  notes: string | null;
  ai_report: string | null;
  created_at: string;
  completed_at: string | null;
}

export interface ApiError {
  detail: string | { msg: string }[];
}

export interface AdvisorFilters {
  min_price: number | null;
  max_price: number | null;
  min_year: number | null;
  max_year: number | null;
  condition: VehicleCondition | null;
  state: string | null;
  features: VehicleFeature[];
}

export interface SuggestedModel {
  make: string;
  model: string;
  reason: string;
  listings: number;
}

export interface ChatTurn {
  role: "user" | "assistant";
  content: string;
}

export interface AdvisorResponse {
  ai_available: boolean;
  reply: string | null;
  searched: boolean;
  filters: AdvisorFilters;
  suggested_models: SuggestedModel[];
  vehicles: { vehicle: Vehicle; recommended: boolean }[];
  relaxed: boolean;
}
