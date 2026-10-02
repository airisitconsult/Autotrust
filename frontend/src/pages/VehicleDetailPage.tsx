import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { extractErrorMessage } from "../api/client";
import { requestInspection } from "../api/inspections";
import { deleteVehicle, getVehicleInspectionHistory, updateVehicle, getVehicle } from "../api/vehicles";
import { ConditionBadge, VettedBadge } from "../components/Badge";
import { PhotoGallery } from "../components/PhotoGallery";
import { FullPageSpinner } from "../components/Spinner";
import { useAuth } from "../context/AuthContext";
import { featureLabel } from "../types";

function formatPrice(price: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(price);
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
}

export function VehicleDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const vehicleQuery = useQuery({
    queryKey: ["vehicle", id],
    queryFn: () => getVehicle(id!),
    enabled: !!id,
  });

  const historyQuery = useQuery({
    queryKey: ["vehicle-inspections", id],
    queryFn: () => getVehicleInspectionHistory(id!),
    enabled: !!id,
  });

  const requestInspectionMutation = useMutation({
    mutationFn: () => requestInspection(id!),
    onSuccess: () => {
      setActionError(null);
      setActionMessage("Inspection requested. An AutoTrust inspector will review it soon.");
    },
    onError: (err) => setActionError(extractErrorMessage(err)),
  });

  const markSoldMutation = useMutation({
    mutationFn: () => updateVehicle(id!, { status: "sold" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vehicle", id] });
      setActionError(null);
    },
    onError: (err) => setActionError(extractErrorMessage(err)),
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteVehicle(id!),
    onSuccess: () => navigate("/my-listings"),
    onError: (err) => setActionError(extractErrorMessage(err)),
  });

  if (vehicleQuery.isLoading) return <FullPageSpinner />;

  if (vehicleQuery.isError || !vehicleQuery.data) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center">
        <h2 className="text-xl font-semibold text-slate-900">Vehicle not found</h2>
        <Link to="/" className="mt-4 inline-block text-brand-600 hover:underline">
          &larr; Back to marketplace
        </Link>
      </div>
    );
  }

  const vehicle = vehicleQuery.data;
  const isOwner = user?.id === vehicle.owner_id;
  const history = historyQuery.data ?? [];

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <Link to="/" className="mb-6 inline-flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-brand-600">
        &larr; Back to marketplace
      </Link>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <PhotoGallery vehicle={vehicle} />

          <div className="mt-6 flex flex-wrap items-center gap-2">
            {vehicle.is_vetted && <VettedBadge />}
            <ConditionBadge condition={vehicle.condition} />
            {vehicle.status === "sold" && (
              <span className="rounded-full bg-slate-900 px-2.5 py-0.5 text-xs font-semibold text-white">
                Sold
              </span>
            )}
          </div>

          <h1 className="mt-3 text-2xl font-extrabold text-slate-900 sm:text-3xl">
            {vehicle.year} {vehicle.make} {vehicle.model}
          </h1>
          <p className="mt-1 text-slate-500">
            {vehicle.mileage.toLocaleString()} km &middot; {vehicle.lga}, {vehicle.state} &middot; VIN {vehicle.vin}
          </p>

          <p className="mt-4 whitespace-pre-line text-slate-700">{vehicle.description}</p>

          {vehicle.features.length > 0 && (
            <div className="mt-6">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                Features
              </h2>
              <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1.5 sm:grid-cols-3">
                {vehicle.features.map((f) => (
                  <div key={f} className="flex items-center gap-1.5 text-sm text-slate-700">
                    <svg className="h-4 w-4 flex-shrink-0 text-emerald-500" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z"
                        clipRule="evenodd"
                      />
                    </svg>
                    {featureLabel(f)}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mt-8">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
              Inspection reports
            </h2>
            {historyQuery.isLoading && <p className="mt-2 text-sm text-slate-400">Loading…</p>}
            {!historyQuery.isLoading && history.length === 0 && (
              <p className="mt-2 text-sm text-slate-400">
                No completed inspections yet for this vehicle.
              </p>
            )}
            <div className="mt-3 space-y-3">
              {history.map((insp) => (
                <div
                  key={insp.id}
                  className={`rounded-xl border p-4 ${
                    insp.passed
                      ? "border-emerald-200 bg-emerald-50"
                      : "border-red-200 bg-red-50"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-sm font-semibold ${
                        insp.passed ? "text-emerald-700" : "text-red-700"
                      }`}
                    >
                      {insp.passed ? "Passed inspection" : "Did not pass inspection"}
                    </span>
                    <span className="text-xs text-slate-500">
                      {insp.completed_at && formatDate(insp.completed_at)}
                    </span>
                  </div>
                  {insp.ai_report && (
                    <p className="mt-2 text-sm text-slate-700">{insp.ai_report}</p>
                  )}
                  {!insp.ai_report && insp.notes && (
                    <p className="mt-2 text-sm text-slate-700">{insp.notes}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div>
          <div className="sticky top-20 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-3xl font-extrabold text-slate-900">{formatPrice(vehicle.price)}</p>

            {actionMessage && (
              <p className="mt-3 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">
                {actionMessage}
              </p>
            )}
            {actionError && (
              <p className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">{actionError}</p>
            )}

            {!isOwner && (
              <p className="mt-4 text-sm text-slate-500">
                Interested in this vehicle? Contact flows aren't built yet —
                this is a browsing &amp; vetting demo for now.
              </p>
            )}

            {isOwner && (
              <div className="mt-4 flex flex-col gap-2">
                <button
                  onClick={() => requestInspectionMutation.mutate()}
                  disabled={requestInspectionMutation.isPending}
                  className="rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
                >
                  {requestInspectionMutation.isPending ? "Requesting…" : "Request AutoTrust inspection"}
                </button>
                <Link
                  to={`/edit-listing/${vehicle.id}`}
                  className="rounded-lg border border-slate-200 px-4 py-2.5 text-center text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Edit listing
                </Link>
                {vehicle.status !== "sold" && (
                  <button
                    onClick={() => markSoldMutation.mutate()}
                    disabled={markSoldMutation.isPending}
                    className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                  >
                    Mark as sold
                  </button>
                )}
                <button
                  onClick={() => {
                    if (confirm("Delete this listing? This cannot be undone.")) {
                      deleteMutation.mutate();
                    }
                  }}
                  disabled={deleteMutation.isPending}
                  className="rounded-lg px-4 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
                >
                  Delete listing
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
