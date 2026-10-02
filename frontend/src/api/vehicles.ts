import { apiClient } from "./client";
import type { Inspection, Vehicle, VehicleFilters, VehicleInput, VehiclePhoto } from "../types";

export async function listVehicles(filters: VehicleFilters = {}): Promise<Vehicle[]> {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") return;
    if (Array.isArray(value)) {
      value.forEach((v) => params.append(key, String(v)));
    } else {
      params.append(key, String(value));
    }
  });
  const { data } = await apiClient.get<Vehicle[]>(`/vehicles?${params.toString()}`);
  return data;
}

export async function listAvailableMakes(): Promise<string[]> {
  const { data } = await apiClient.get<string[]>("/vehicles/makes");
  return data;
}

export async function listAvailableModels(make?: string): Promise<string[]> {
  const { data } = await apiClient.get<string[]>("/vehicles/models", {
    params: make ? { make } : undefined,
  });
  return data;
}

export async function listMyVehicles(): Promise<Vehicle[]> {
  const { data } = await apiClient.get<Vehicle[]>("/vehicles/mine");
  return data;
}

export async function getVehicle(id: string): Promise<Vehicle> {
  const { data } = await apiClient.get<Vehicle>(`/vehicles/${id}`);
  return data;
}

export async function getVehicleInspectionHistory(id: string): Promise<Inspection[]> {
  const { data } = await apiClient.get<Inspection[]>(`/vehicles/${id}/inspections`);
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

export async function uploadVehiclePhoto(id: string, file: File): Promise<VehiclePhoto> {
  const body = new FormData();
  body.append("file", file);
  const { data } = await apiClient.post<VehiclePhoto>(`/vehicles/${id}/photos`, body);
  return data;
}

export async function deleteVehiclePhoto(vehicleId: string, photoId: string): Promise<void> {
  await apiClient.delete(`/vehicles/${vehicleId}/photos/${photoId}`);
}

export async function deleteVehicle(id: string): Promise<void> {
  await apiClient.delete(`/vehicles/${id}`);
}
