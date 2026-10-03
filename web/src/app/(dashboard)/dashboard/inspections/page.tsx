"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { Panel } from "@/components/dashboard/cards";
import { PageHeader } from "@/components/dashboard/shell";
import { Button } from "@/components/ui/button";
import { ErrorNote, Textarea } from "@/components/ui/fields";
import { Skeleton } from "@/components/ui/spinner";
import { useAuth } from "@/context/auth";
import { canInspect } from "@/lib/access";
import { assetUrl } from "@/lib/assets";
import { completeInspection, extractErrorMessage, getVehicle, listPendingInspections } from "@/lib/api";
import { cn } from "@/lib/cn";
import { formatDate, formatMileage, formatPrice, titleCase } from "@/lib/format";
import { BODY_TYPE_LABELS, type Inspection, type Vehicle } from "@/lib/types";

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-night-900 px-3 py-2.5">
      <dt className="text-[11px] font-medium text-night-muted">{label}</dt>
      <dd className="truncate text-sm font-bold text-night-text">{value}</dd>
    </div>
  );
}

function InspectionCard({ inspection }: { inspection: Inspection }) {
  const queryClient = useQueryClient();
  const [passed, setPassed] = useState<boolean | null>(null);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<Inspection | null>(null);

  const { data: vehicle } = useQuery<Vehicle>({
    queryKey: ["vehicle", inspection.vehicle_id],
    queryFn: () => getVehicle(inspection.vehicle_id),
  });

  const complete = useMutation({
    mutationFn: () => completeInspection(inspection.id, passed as boolean, notes.trim()),
    onSuccess: (result) => {
      setDone(result);
      queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
    },
    onError: (err) => setError(extractErrorMessage(err)),
  });

  function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (passed === null) return setError("Choose Pass or Fail first.");
    if (notes.trim().length < 10) return setError("Add a few notes about what you found (at least 10 characters).");
    complete.mutate();
  }

  if (done) {
    return (
      <Panel className={done.passed ? "!border-trust-500/40" : "!border-red-500/40"}>
        <p className={cn("text-lg font-extrabold", done.passed ? "text-trust-300" : "text-red-300")}>
          {done.passed ? "✓ Passed — the car is now on sale" : "✗ Recorded as failed — the car stays off sale"}
        </p>
        {vehicle && (
          <p className="mt-1 text-sm text-night-muted">
            {vehicle.year} {vehicle.make} {vehicle.model}
          </p>
        )}
        {done.ai_report ? (
          <div className="mt-4 rounded-2xl bg-night-900 p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-accent">Report buyers will read</p>
            <p className="mt-1.5 text-sm leading-relaxed text-night-text">{done.ai_report}</p>
          </div>
        ) : (
          <p className="mt-3 text-sm text-night-muted">Your notes are shown to buyers as written.</p>
        )}
        <Button
          variant="secondary"
          size="sm"
          className="mt-4"
          onClick={() => queryClient.invalidateQueries({ queryKey: ["pending-inspections"] })}
        >
          Done
        </Button>
      </Panel>
    );
  }

  return (
    <Panel>
      {!vehicle ? (
        <Skeleton className="h-40 !bg-night-700" />
      ) : (
        <>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-extrabold text-night-text">
                {vehicle.year} {vehicle.make} {vehicle.model}
              </h2>
              <p className="text-sm text-night-muted">
                {vehicle.lga}, {vehicle.state} · requested {formatDate(inspection.created_at)}
              </p>
            </div>
            <p className="text-lg font-extrabold text-night-text">{formatPrice(vehicle.price)}</p>
          </div>

          {vehicle.photos.length > 0 && (
            <div className="no-scrollbar mt-4 flex gap-2 overflow-x-auto">
              {vehicle.photos.map((p) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={p.id}
                  src={assetUrl(p.thumb_url)}
                  alt=""
                  className="h-24 w-36 flex-shrink-0 rounded-xl object-cover"
                />
              ))}
            </div>
          )}

          <dl className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
            <Fact label="VIN" value={vehicle.vin} />
            <Fact label="Mileage" value={formatMileage(vehicle.mileage)} />
            <Fact label="Seller says" value={titleCase(vehicle.condition)} />
            <Fact label="Type" value={vehicle.body_type ? BODY_TYPE_LABELS[vehicle.body_type] : "—"} />
          </dl>
          {vehicle.features.length > 0 && (
            <p className="mt-3 text-sm text-night-muted">
              <span className="font-semibold text-night-text">Features listed: </span>
              {vehicle.features.map(titleCase).join(", ")}
            </p>
          )}
          <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-night-muted">{vehicle.description}</p>
        </>
      )}

      <form onSubmit={submit} className="mt-5 border-t border-night-line pt-5">
        <p className="text-sm font-bold text-night-text">Your findings</p>
        <div className="mt-3 grid grid-cols-2 gap-3">
          {(
            [
              [true, "Passed", "border-trust-500 bg-trust-500/15 text-trust-300"],
              [false, "Failed", "border-red-500 bg-red-500/15 text-red-300"],
            ] as const
          ).map(([value, label, on]) => (
            <button
              key={label}
              type="button"
              aria-pressed={passed === value}
              onClick={() => setPassed(value)}
              className={cn(
                "min-h-12 rounded-xl border-2 text-sm font-bold transition",
                passed === value ? on : "border-night-line text-night-muted hover:bg-night-700",
              )}
            >
              {value ? "✓ " : "✗ "}
              {label}
            </button>
          ))}
        </div>
        <Textarea
          rows={4}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="What did you check and find? Engine, gearbox, brakes, tyres, body, interior, electrics, any damage…"
          className="mt-3"
        />
        <p className="mt-1 text-xs text-night-muted">
          AI turns your notes into a short, plain-language report that buyers see.
        </p>
        {error && (
          <div className="mt-3">
            <ErrorNote>{error}</ErrorNote>
          </div>
        )}
        <Button type="submit" className="mt-4" disabled={complete.isPending}>
          {complete.isPending ? "Saving…" : "Submit result"}
        </Button>
      </form>
    </Panel>
  );
}

export default function InspectionsPage() {
  const { user } = useAuth();
  const { data, isLoading, isError } = useQuery({
    queryKey: ["pending-inspections"],
    queryFn: listPendingInspections,
    enabled: canInspect(user),
  });

  if (user && !canInspect(user)) {
    return (
      <p className="rounded-2xl border border-night-line bg-night-800 p-6 text-night-muted">
        The inspection queue is for inspectors and admins with the manage inspections permission.
      </p>
    );
  }

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title="Inspection queue"
        subtitle="Cars waiting to be inspected. Pass a car and it goes on sale with the Vetted badge."
      />
      {isLoading && <Skeleton className="h-64 !bg-night-800" />}
      {isError && <ErrorNote>Couldn&apos;t load the queue.</ErrorNote>}
      {data && data.length === 0 && (
        <Panel className="py-14 text-center">
          <p className="text-lg font-bold text-night-text">Nothing is waiting</p>
          <p className="mt-1 text-sm text-night-muted">New requests appear here as soon as sellers make them.</p>
        </Panel>
      )}
      <div className="space-y-5">
        {data?.map((i) => (
          <InspectionCard key={i.id} inspection={i} />
        ))}
      </div>
    </div>
  );
}
