import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Link } from "react-router-dom";
import { extractErrorMessage } from "../api/client";
import { completeInspection, listPendingInspections } from "../api/inspections";
import { getVehicle } from "../api/vehicles";
import { DashboardLayout } from "../components/DashboardLayout";
import { FullPageSpinner } from "../components/Spinner";
import type { Inspection } from "../types";

function InspectionRow({ inspection }: { inspection: Inspection }) {
  const queryClient = useQueryClient();
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

  const vehicleQuery = useQuery({
    queryKey: ["vehicle", inspection.vehicle_id],
    queryFn: () => getVehicle(inspection.vehicle_id),
  });

  const mutation = useMutation({
    mutationFn: (passed: boolean) => completeInspection(inspection.id, passed, notes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pending-inspections"] });
    },
    onError: (err) => setError(extractErrorMessage(err)),
  });

  const vehicle = vehicleQuery.data;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-semibold text-slate-900">
            {vehicle ? `${vehicle.year} ${vehicle.make} ${vehicle.model}` : "Loading vehicle…"}
          </p>
          {vehicle && (
            <p className="text-sm text-slate-500">
              VIN {vehicle.vin} &middot; {vehicle.lga}, {vehicle.state}
            </p>
          )}
          <p className="mt-1 text-xs text-slate-400">
            Requested {new Date(inspection.created_at).toLocaleDateString()}
          </p>
        </div>
        {vehicle && (
          <Link
            to={`/vehicles/${vehicle.id}`}
            className="flex-shrink-0 text-sm font-medium text-brand-600 hover:underline"
          >
            View listing
          </Link>
        )}
      </div>

      {!expanded ? (
        <button
          onClick={() => setExpanded(true)}
          className="mt-4 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
        >
          Submit findings
        </button>
      ) : (
        <div className="mt-4 border-t border-slate-100 pt-4">
          {error && <p className="mb-3 rounded-lg bg-red-50 p-2 text-sm text-red-700">{error}</p>}
          <label className="text-sm font-medium text-slate-700">Inspection notes</label>
          <textarea
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Engine, brakes, tires, body condition…"
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
          />
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              onClick={() => mutation.mutate(true)}
              disabled={!notes || mutation.isPending}
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              Pass
            </button>
            <button
              onClick={() => mutation.mutate(false)}
              disabled={!notes || mutation.isPending}
              className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
            >
              Fail
            </button>
            <button
              onClick={() => setExpanded(false)}
              className="rounded-lg px-4 py-2 text-sm font-medium text-slate-500 hover:bg-slate-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function InspectorDashboardPage() {
  const { data: inspections, isLoading } = useQuery({
    queryKey: ["pending-inspections"],
    queryFn: listPendingInspections,
  });

  return (
    <DashboardLayout title="Inspection Queue">
      <p className="mb-6 text-slate-500">Pending inspection requests awaiting your review.</p>

      <div className="flex flex-col gap-4 max-w-3xl">
        {isLoading && <FullPageSpinner />}

        {inspections && inspections.length === 0 && (
          <div className="rounded-xl border border-dashed border-slate-300 p-12 text-center text-slate-500">
            No pending inspections right now.
          </div>
        )}

        {inspections?.map((insp) => (
          <InspectionRow key={insp.id} inspection={insp} />
        ))}
      </div>
    </DashboardLayout>
  );
}
