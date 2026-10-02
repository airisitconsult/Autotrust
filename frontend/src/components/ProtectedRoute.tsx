import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import type { User } from "../types";
import { FullPageSpinner } from "./Spinner";

export function ProtectedRoute({
  children,
  allow,
  restrictedMessage = "You don't have access to this page.",
}: {
  children: ReactNode;
  /** Extra check beyond being logged in, e.g. `canInspect`. */
  allow?: (user: User) => boolean;
  restrictedMessage?: string;
}) {
  const { user, loading } = useAuth();

  if (loading) return <FullPageSpinner />;
  if (!user) return <Navigate to="/login" replace />;
  if (allow && !allow(user)) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center">
        <h2 className="text-xl font-semibold text-slate-900">Access restricted</h2>
        <p className="mt-2 text-slate-500">{restrictedMessage}</p>
      </div>
    );
  }
  return <>{children}</>;
}
