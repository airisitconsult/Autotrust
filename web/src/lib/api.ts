/**
 * Browser-side API client (client components only). Server-rendered public
 * pages use lib/server-api.ts instead.
 */
import axios from "axios";
import { API_URL } from "./assets";
import { buildVehicleQuery } from "./vehicle-query";
import type {
  AdminVehicleFilters,
  AdminVehiclePage,
  AdvisorResponse,
  BankDetails,
  EnquiryDetail,
  EnquirySummary,
  Order,
  OrderStatus,
  ChatTurn,
  DashboardSummary,
  Inspection,
  Permission,
  PermissionInfo,
  User,
  UserRole,
  Vehicle,
  VehicleFilters,
  VehicleInput,
  VehiclePhoto,
} from "./types";

export { API_URL, assetUrl } from "./assets";

// --- Token (kept in localStorage; every access is guarded because storage
// can be unavailable, and pages are also rendered on the server) ---

const TOKEN_KEY = "autotrust_token";

export function getToken(): string | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setToken(token: string): void {
  try {
    window.localStorage.setItem(TOKEN_KEY, token);
  } catch {
    // ignore
  }
}

export function clearToken(): void {
  try {
    window.localStorage.removeItem(TOKEN_KEY);
  } catch {
    // ignore
  }
}

export const apiClient = axios.create({ baseURL: API_URL });

apiClient.interceptors.request.use((config) => {
  const token = getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export function extractErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const detail = error.response?.data?.detail;
    if (typeof detail === "string") return detail;
    if (Array.isArray(detail) && detail.length > 0) {
      return detail.map((d) => d.msg ?? JSON.stringify(d)).join(", ");
    }
    if (error.code === "ERR_NETWORK") return "Can't reach the server. Is the backend running?";
    if (error.message) return error.message;
  }
  return "Something went wrong. Please try again.";
}

// --- Auth ---

export async function register(
  email: string,
  password: string,
  accountType: "buyer" | "seller" = "buyer",
): Promise<User> {
  const { data } = await apiClient.post<User>("/auth/register", {
    email,
    password,
    account_type: accountType,
  });
  return data;
}

export async function verifyEmail(token: string): Promise<User> {
  const { data } = await apiClient.post<User>("/auth/verify-email", { token });
  return data;
}

export async function resendVerification(): Promise<{ already_verified: boolean; sent: boolean }> {
  const { data } = await apiClient.post("/auth/resend-verification");
  return data;
}

export async function becomeSeller(): Promise<User> {
  const { data } = await apiClient.post<User>("/auth/become-seller");
  return data;
}

export async function getBankDetails(): Promise<BankDetails | null> {
  const { data } = await apiClient.get<BankDetails | null>("/auth/me/bank-details");
  return data;
}

export async function saveBankDetails(details: BankDetails): Promise<User> {
  const { data } = await apiClient.put<User>("/auth/me/bank-details", details);
  return data;
}

export async function login(email: string, password: string): Promise<string> {
  const { data } = await apiClient.post<{ access_token: string }>("/auth/login", { email, password });
  return data.access_token;
}

export async function getCurrentUser(): Promise<User> {
  const { data } = await apiClient.get<User>("/auth/me");
  return data;
}

// --- Vehicles ---

export async function listMyVehicles(): Promise<Vehicle[]> {
  const { data } = await apiClient.get<Vehicle[]>("/vehicles/mine?limit=100");
  return data;
}

export async function getVehicle(id: string): Promise<Vehicle> {
  const { data } = await apiClient.get<Vehicle>(`/vehicles/${id}`);
  return data;
}

export async function listVehicles(filters: VehicleFilters = {}): Promise<Vehicle[]> {
  const { data } = await apiClient.get<Vehicle[]>(`/vehicles?${buildVehicleQuery(filters)}`);
  return data;
}

export async function listMakes(): Promise<string[]> {
  const { data } = await apiClient.get<string[]>("/vehicles/makes");
  return data;
}

export async function listModels(make?: string): Promise<string[]> {
  const { data } = await apiClient.get<string[]>("/vehicles/models", {
    params: make ? { make } : undefined,
  });
  return data;
}

export async function createVehicle(input: VehicleInput): Promise<Vehicle> {
  const { data } = await apiClient.post<Vehicle>("/vehicles", input);
  return data;
}

export async function updateVehicle(
  id: string,
  changes: Partial<VehicleInput> & { status?: string },
): Promise<Vehicle> {
  const { data } = await apiClient.patch<Vehicle>(`/vehicles/${id}`, changes);
  return data;
}

export async function deleteVehicle(id: string): Promise<void> {
  await apiClient.delete(`/vehicles/${id}`);
}

export async function uploadVehiclePhoto(
  id: string,
  file: File,
  kind: "photo" | "spin" = "photo",
): Promise<VehiclePhoto> {
  const body = new FormData();
  body.append("file", file);
  const { data } = await apiClient.post<VehiclePhoto>(`/vehicles/${id}/photos?kind=${kind}`, body);
  return data;
}

export async function deleteSpinSet(vehicleId: string): Promise<void> {
  await apiClient.delete(`/vehicles/${vehicleId}/spin`);
}

export async function deleteVehiclePhoto(vehicleId: string, photoId: string): Promise<void> {
  await apiClient.delete(`/vehicles/${vehicleId}/photos/${photoId}`);
}

export type StatesLgas = Record<string, string[]>;

export async function getStatesLgas(): Promise<StatesLgas> {
  const { data } = await apiClient.get<StatesLgas>("/reference/states-lgas");
  return data;
}

// --- Inspections ---

export async function requestInspection(vehicleId: string): Promise<Inspection> {
  const { data } = await apiClient.post<Inspection>("/inspections", { vehicle_id: vehicleId });
  return data;
}

export async function listPendingInspections(): Promise<Inspection[]> {
  const { data } = await apiClient.get<Inspection[]>("/inspections/pending?limit=100");
  return data;
}

export async function completeInspection(
  id: string,
  passed: boolean,
  notes: string,
): Promise<Inspection> {
  const { data } = await apiClient.post<Inspection>(`/inspections/${id}/complete`, { passed, notes });
  return data;
}

// --- Dashboard ---

export async function getDashboardSummary(): Promise<DashboardSummary> {
  const { data } = await apiClient.get<DashboardSummary>("/dashboard/summary");
  return data;
}

// --- Admin ---

export async function listPermissions(): Promise<PermissionInfo[]> {
  const { data } = await apiClient.get<PermissionInfo[]>("/admin/permissions");
  return data;
}

export async function listMajorAdmins(): Promise<User[]> {
  const { data } = await apiClient.get<User[]>("/admin/major-admins");
  return data;
}

export async function createMajorAdmin(input: {
  email: string;
  password: string;
  permissions: Permission[];
}): Promise<User> {
  const { data } = await apiClient.post<User>("/admin/major-admins", input);
  return data;
}

export async function setMajorAdminPermissions(
  userId: string,
  permissions: Permission[],
): Promise<User> {
  const { data } = await apiClient.put<User>(`/admin/major-admins/${userId}/permissions`, {
    permissions,
  });
  return data;
}

export async function removeMajorAdmin(userId: string): Promise<void> {
  await apiClient.delete(`/admin/major-admins/${userId}`);
}

export async function listUsers(params: {
  q?: string;
  role?: UserRole;
  limit?: number;
  offset?: number;
}): Promise<User[]> {
  const { data } = await apiClient.get<User[]>("/admin/users", { params });
  return data;
}

export async function setUserRole(
  userId: string,
  role: "buyer" | "seller" | "inspector",
): Promise<User> {
  const { data } = await apiClient.patch<User>(`/admin/users/${userId}/role`, { role });
  return data;
}

// --- AI advisor ---

export async function askAdvisor(messages: ChatTurn[]): Promise<AdvisorResponse> {
  const { data } = await apiClient.post<AdvisorResponse>("/advisor/recommend", { messages });
  return data;
}


// --- Enquiries ---

export async function startEnquiry(vehicleId: string, message: string): Promise<EnquiryDetail> {
  const { data } = await apiClient.post<EnquiryDetail>("/enquiries", { vehicle_id: vehicleId, message });
  return data;
}

export async function listEnquiries(): Promise<EnquirySummary[]> {
  const { data } = await apiClient.get<EnquirySummary[]>("/enquiries");
  return data;
}

export async function getEnquiry(id: string): Promise<EnquiryDetail> {
  const { data } = await apiClient.get<EnquiryDetail>(`/enquiries/${id}`);
  return data;
}

export async function sendEnquiryMessage(id: string, body: string): Promise<EnquiryDetail> {
  const { data } = await apiClient.post<EnquiryDetail>(`/enquiries/${id}/messages`, { body });
  return data;
}

// --- Orders ---

export async function createOrder(vehicleId: string): Promise<Order> {
  const { data } = await apiClient.post<Order>("/orders", { vehicle_id: vehicleId });
  return data;
}

export async function listOrders(
  params: { scope?: "mine" | "all"; status?: OrderStatus } = {},
): Promise<Order[]> {
  const { data } = await apiClient.get<Order[]>("/orders", { params });
  return data;
}

export async function getOrder(id: string): Promise<Order> {
  const { data } = await apiClient.get<Order>(`/orders/${id}`);
  return data;
}

export type OrderAction =
  | { type: "submit_payment"; payer_name: string; bank_reference?: string; note?: string }
  | { type: "confirm_receipt" }
  | { type: "cancel"; reason?: string }
  | { type: "confirm_payment" }
  | { type: "reject_payment"; reason: string }
  | { type: "mark_delivered" }
  | { type: "record_payout"; payout_reference: string };

const ORDER_ACTION_PATHS: Record<OrderAction["type"], string> = {
  submit_payment: "payment",
  confirm_receipt: "confirm-receipt",
  cancel: "cancel",
  confirm_payment: "confirm-payment",
  reject_payment: "reject-payment",
  mark_delivered: "mark-delivered",
  record_payout: "payout",
};

/** Run one step of an order. The server decides whether this person may. */
export async function orderAction(id: string, action: OrderAction): Promise<Order> {
  const { type, ...body } = action;
  const { data } = await apiClient.post<Order>(
    `/orders/${id}/${ORDER_ACTION_PATHS[type]}`,
    Object.keys(body).length > 0 ? body : undefined,
  );
  return data;
}

// --- Staff listings overview ---

export async function listAdminVehicles(
  filters: AdminVehicleFilters & { seller_id?: string },
): Promise<AdminVehiclePage> {
  const { data } = await apiClient.get<AdminVehiclePage>(`/admin/vehicles?${buildVehicleQuery(filters)}`);
  return data;
}


// --- Platform settings (public) ---

export interface PlatformInfo {
  fee_rate: number;
  currency: string;
  payments_enabled: boolean;
}

export async function getPlatformInfo(): Promise<PlatformInfo> {
  const { data } = await apiClient.get<PlatformInfo>("/reference/platform");
  return data;
}


// --- Inspection history (sent with the login so owners and inspectors can see drafts) ---

export async function getVehicleInspections(vehicleId: string): Promise<Inspection[]> {
  const { data } = await apiClient.get<Inspection[]>(`/vehicles/${vehicleId}/inspections`);
  return data;
}
