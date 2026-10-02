import axios from "axios";

export const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

/** Turn a stored photo path (/uploads/...) into a loadable URL. Absolute URLs
 * (e.g. from cloud storage later) pass through untouched. */
export function assetUrl(path: string): string {
  return /^https?:\/\//.test(path) ? path : `${API_URL}${path}`;
}

const TOKEN_KEY = "autotrust_token";

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

export const apiClient = axios.create({ baseURL: API_URL });

apiClient.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export function extractErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const detail = error.response?.data?.detail;
    if (typeof detail === "string") return detail;
    if (Array.isArray(detail) && detail.length > 0) {
      return detail.map((d) => d.msg ?? JSON.stringify(d)).join(", ");
    }
    if (error.message) return error.message;
  }
  return "Something went wrong. Please try again.";
}
