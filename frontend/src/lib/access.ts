import type { Permission, User, UserRole } from "../types";

const ROLE_LABELS: Record<UserRole, string> = {
  buyer: "Buyer",
  seller: "Seller",
  inspector: "Inspector",
  admin: "Major admin",
  super_admin: "Super admin",
};

export function roleLabel(role: UserRole): string {
  return ROLE_LABELS[role];
}

export function isSuperAdmin(user: User | null | undefined): boolean {
  return user?.role === "super_admin";
}

/** Mirrors the backend's has_permission: the super admin holds everything, a
 * major admin only what was granted. This only decides what the UI shows —
 * the server enforces it regardless. */
export function hasPermission(user: User | null | undefined, permission: Permission): boolean {
  if (!user) return false;
  if (user.role === "super_admin") return true;
  return user.role === "admin" && user.permissions.includes(permission);
}

export function canInspect(user: User | null | undefined): boolean {
  return user?.role === "inspector" || hasPermission(user, "manage_inspections");
}
