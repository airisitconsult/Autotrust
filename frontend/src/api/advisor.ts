import { apiClient } from "./client";
import type { AdvisorResponse, ChatTurn } from "../types";

export async function askAdvisor(messages: ChatTurn[]): Promise<AdvisorResponse> {
  const { data } = await apiClient.post<AdvisorResponse>("/advisor/recommend", { messages });
  return data;
}
