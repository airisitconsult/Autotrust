import { apiClient } from "./client";
import type { Inspection } from "../types";

export async function requestInspection(vehicleId: string): Promise<Inspection> {
  const { data } = await apiClient.post<Inspection>("/inspections", { vehicle_id: vehicleId });
  return data;
}

export async function listPendingInspections(): Promise<Inspection[]> {
  const { data } = await apiClient.get<Inspection[]>("/inspections/pending");
  return data;
}

export async function getInspection(id: string): Promise<Inspection> {
  const { data } = await apiClient.get<Inspection>(`/inspections/${id}`);
  return data;
}

export async function completeInspection(
  id: string,
  passed: boolean,
  notes: string,
): Promise<Inspection> {
  const { data } = await apiClient.post<Inspection>(`/inspections/${id}/complete`, {
    passed,
    notes,
  });
  return data;
}
