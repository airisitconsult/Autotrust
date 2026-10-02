import { apiClient } from "./client";
import type { Permission, PermissionInfo, User, UserRole } from "../types";

// --- Team management (super admin only) ---

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

// --- User management (needs the manage_users permission) ---

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
