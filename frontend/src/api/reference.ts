import { apiClient } from "./client";

export type StatesLgas = Record<string, string[]>;

export async function getStatesLgas(): Promise<StatesLgas> {
  const { data } = await apiClient.get<StatesLgas>("/reference/states-lgas");
  return data;
}
