/** Safe to import from server and client code alike (no browser APIs). */
export const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

/** Turn a stored photo path (/uploads/...) into a loadable URL. Absolute URLs
 * (Cloudinary) pass through untouched. */
export function assetUrl(path: string): string {
  return /^https?:\/\//.test(path) ? path : `${API_URL}${path}`;
}
