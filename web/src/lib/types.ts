// "admin" is the *major admin* (support staff); "super_admin" is the single
// owner account. See lib/access.ts for the display names and permission checks.
export type UserRole = "buyer" | "seller" | "inspector" | "admin" | "super_admin";

export type Permission =
  | "manage_inspections"
  | "manage_users"
  | "manage_payments"
  | "manage_listings";

export interface PermissionInfo {
  value: Permission;
  description: string;
}

export interface User {
  id: string;
  email: string;
  role: UserRole;
  permissions: Permission[];
  email_verified: boolean;
  has_bank_details: boolean;
  created_at: string;
}

export type VehicleCondition = "excellent" | "good" | "fair" | "poor";
// "draft": a seller's car before it passes inspection (private). "reserved":
// somebody is buying it right now.
export type VehicleStatus = "draft" | "listed" | "reserved" | "sold";

export const BODY_TYPES = [
  "sedan",
  "suv",
  "hatchback",
  "coupe",
  "wagon",
  "pickup",
  "van",
  "minivan",
  "convertible",
] as const;

export type BodyType = (typeof BODY_TYPES)[number];

export const BODY_TYPE_LABELS: Record<BodyType, string> = {
  sedan: "Sedan",
  suv: "SUV",
  hatchback: "Hatchback",
  coupe: "Coupe",
  wagon: "Wagon",
  pickup: "Pickup",
  van: "Van",
  minivan: "Minivan",
  convertible: "Convertible",
};

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
  /** "photo" for gallery pictures; "spin" for 360-degree frames. */
  kind: "photo" | "spin";
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
  body_type: BodyType | null;
  state: string;
  lga: string;
  description: string;
  status: VehicleStatus;
  is_vetted: boolean;
  features: VehicleFeature[];
  /** Gallery pictures. */
  photos: VehiclePhoto[];
  /** 360-degree walk-around frames, in order. */
  spin: VehiclePhoto[];
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
  body_type: BodyType;
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
  body_type?: BodyType;
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

// --- Dashboard ---

export interface MonthPoint {
  month: string;
  label: string;
  count: number;
}

export interface MoneyPoint {
  month: string;
  label: string;
  amount: number;
}

export interface DashboardSummary {
  /** "platform" for staff (whole marketplace), "personal" for everyone else. */
  scope: "personal" | "platform";
  stats: {
    listings_total: number;
    listings_active: number;
    listings_sold: number;
    vetted: number;
    active_value: number;
    inspections_pending: number;
    inspections_completed: number;
    inspections_passed: number;
    users_total: number | null;
    sales_volume: number;
    earnings: number;
    earnings_pending: number;
    orders_open: number;
    unread_enquiries: number;
    payments_to_confirm: number | null;
    payouts_due: number | null;
  };
  listings_series: MonthPoint[];
  inspections_series: MonthPoint[];
  sales_series: MoneyPoint[];
  by_state: { state: string; count: number }[];
  recent_listings: Vehicle[];
}


// --- Enquiries ---

export interface VehicleBrief {
  id: string;
  title: string;
  price: number;
  status: VehicleStatus;
  location: string;
  thumb_url: string | null;
}

export interface EnquirySummary {
  id: string;
  vehicle: VehicleBrief;
  my_role: "buyer" | "seller";
  counterparty: string;
  last_message_preview: string;
  last_message_at: string;
  unread: boolean;
}

export interface EnquiryMessage {
  id: string;
  sender: "buyer" | "seller";
  mine: boolean;
  body: string;
  created_at: string;
}

export interface EnquiryDetail extends EnquirySummary {
  messages: EnquiryMessage[];
}

// --- Orders ---

export type OrderStatus =
  | "pending_payment"
  | "payment_submitted"
  | "paid"
  | "delivered"
  | "completed"
  | "cancelled";

export interface BankDetails {
  bank_name: string;
  account_number: string;
  account_name: string;
}

export interface Order {
  id: string;
  reference: string;
  status: OrderStatus;
  vehicle: VehicleBrief;
  my_role: "buyer" | "seller" | "staff";
  currency: string;
  price: number;
  platform_fee: number;
  seller_payout: number;
  buyer: string;
  seller: string;
  pay_to: (BankDetails & { amount: number; currency: string; reference: string }) | null;
  payment: {
    payer_name: string | null;
    bank_reference: string | null;
    note: string | null;
    submitted_at: string | null;
    rejected_reason: string | null;
  } | null;
  seller_bank: BankDetails | null;
  payout_reference: string | null;
  cancel_reason: string | null;
  created_at: string;
  expires_at: string;
  payment_submitted_at: string | null;
  paid_at: string | null;
  delivered_at: string | null;
  completed_at: string | null;
  cancelled_at: string | null;
  /** What the viewer can do next (submit_payment, cancel, confirm_receipt, confirm_payment, ...). */
  actions: string[];
}

// --- Staff listings overview ---

export interface AdminVehicleItem {
  vehicle: Vehicle;
  owner_email: string;
}

export interface AdminVehiclePage {
  items: AdminVehicleItem[];
  total: number;
}

export interface AdminVehicleFilters extends VehicleFilters {
  scope: "sellers" | "company";
  status?: VehicleStatus;
  seller?: string;
}

/** A 360-degree viewer needs at least this many frames to feel smooth. */
export const MIN_SPIN_FRAMES = 8;

export function hasSpin(vehicle: { spin: unknown[] }): boolean {
  return vehicle.spin.length >= MIN_SPIN_FRAMES;
}
