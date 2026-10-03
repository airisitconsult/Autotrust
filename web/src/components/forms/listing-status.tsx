"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Panel, PanelTitle } from "@/components/dashboard/cards";
import { Button, ButtonLink } from "@/components/ui/button";
import { ErrorNote, SuccessNote } from "@/components/ui/fields";
import { StatusBadge, VettedBadge } from "@/components/ui/badge";
import { useAuth } from "@/context/auth";
import {
  deleteVehicle,
  extractErrorMessage,
  getVehicleInspections,
  requestInspection,
  updateVehicle,
} from "@/lib/api";
import { formatDate } from "@/lib/format";
import type { Vehicle } from "@/lib/types";

/** Where this car is in its journey, and the one next step the owner can take. */
export function ListingStatus({ vehicle }: { vehicle: Vehicle }) {
  const { user } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["vehicle", vehicle.id] });
    queryClient.invalidateQueries({ queryKey: ["my-vehicles"] });
    queryClient.invalidateQueries({ queryKey: ["vehicle-inspections", vehicle.id] });
    queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
  };

  const { data: reports } = useQuery({
    queryKey: ["vehicle-inspections", vehicle.id],
    queryFn: () => getVehicleInspections(vehicle.id),
  });

  const inspect = useMutation({
    mutationFn: () => requestInspection(vehicle.id),
    onSuccess: () => {
      setError(null);
      setMessage("Inspection requested. An AutoTrust inspector will look at your car soon, and it goes on sale if it passes.");
      refresh();
    },
    onError: (err) => {
      setMessage(null);
      setError(extractErrorMessage(err));
    },
  });

  const setStatus = useMutation({
    mutationFn: (status: "draft" | "listed") => updateVehicle(vehicle.id, { status }),
    onSuccess: () => {
      setError(null);
      setMessage(null);
      refresh();
    },
    onError: (err) => setError(extractErrorMessage(err)),
  });

  const remove = useMutation({
    mutationFn: () => deleteVehicle(vehicle.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-vehicles"] });
      router.push("/dashboard/listings");
    },
    onError: (err) => setError(extractErrorMessage(err)),
  });

  const company = user?.role === "super_admin";
  const verified = !!user?.email_verified;

  let headline = "";
  let detail = "";
  if (vehicle.status === "draft" && !vehicle.is_vetted) {
    headline = "Not on sale yet";
    detail = "Buyers can't see this car until it passes an AutoTrust inspection.";
  } else if (vehicle.status === "draft") {
    headline = "Passed inspection — currently off sale";
    detail = "You withdrew it, or you changed something an inspector checks.";
  } else if (vehicle.status === "listed") {
    headline = "Live on AutoTrust";
    detail = "Buyers can find it, message you and buy it.";
  } else if (vehicle.status === "reserved") {
    headline = "A buyer is purchasing this car";
    detail = "It's reserved while they pay. You'll hear when the payment is confirmed.";
  } else {
    headline = "Sold";
    detail = "Your payout is sent once the buyer confirms they have the car.";
  }

  return (
    <Panel>
      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge status={vehicle.status} />
        {vehicle.is_vetted && <VettedBadge />}
      </div>
      <h2 className="mt-3 text-lg font-extrabold text-night-text">{headline}</h2>
      <p className="mt-1 text-sm text-night-muted">{detail}</p>

      <div className="mt-4 space-y-3">
        {message && <SuccessNote>{message}</SuccessNote>}
        {error && <ErrorNote>{error}</ErrorNote>}

        {vehicle.status === "draft" && !vehicle.is_vetted && !company && (
          <>
            <Button className="w-full" onClick={() => inspect.mutate()} disabled={inspect.isPending || !verified}>
              {inspect.isPending ? "Requesting…" : "Request an inspection"}
            </Button>
            {!verified && <p className="text-xs text-gold-400">Verify your email first to request an inspection.</p>}
            <p className="text-xs text-night-muted">
              Add your photos first — inspectors and buyers both like a complete listing.
            </p>
          </>
        )}
        {vehicle.status === "draft" && vehicle.is_vetted && (
          <Button className="w-full" onClick={() => setStatus.mutate("listed")} disabled={setStatus.isPending}>
            Put back on sale
          </Button>
        )}
        {vehicle.status === "draft" && company && (
          <Button className="w-full" onClick={() => setStatus.mutate("listed")} disabled={setStatus.isPending}>
            Put on sale
          </Button>
        )}
        {vehicle.status === "listed" && (
          <>
            <ButtonLink href={`/cars/${vehicle.id}`} variant="secondary" className="w-full">
              View public page
            </ButtonLink>
            <Button
              variant="secondary"
              className="w-full"
              onClick={() => setStatus.mutate("draft")}
              disabled={setStatus.isPending}
            >
              Withdraw from sale
            </Button>
          </>
        )}
        {(vehicle.status === "reserved" || vehicle.status === "sold") && (
          <ButtonLink href="/dashboard/orders" variant="secondary" className="w-full">
            View the order
          </ButtonLink>
        )}
        {(vehicle.status === "draft" || vehicle.status === "listed") && (
          <Button
            variant="danger"
            className="w-full"
            disabled={remove.isPending}
            onClick={() => {
              if (confirm("Delete this listing? This cannot be undone.")) remove.mutate();
            }}
          >
            Delete listing
          </Button>
        )}
      </div>

      {reports && reports.length > 0 && (
        <div className="mt-6 border-t border-night-line pt-5">
          <PanelTitle>Inspection reports</PanelTitle>
          <ul className="space-y-3">
            {reports.map((r) => (
              <li
                key={r.id}
                className={`rounded-2xl p-4 text-sm ring-1 ${
                  r.passed ? "bg-trust-500/10 ring-trust-500/30" : "bg-red-500/10 ring-red-500/30"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className={`font-bold ${r.passed ? "text-trust-300" : "text-red-300"}`}>
                    {r.passed ? "✓ Passed" : "✗ Did not pass"}
                  </p>
                  {r.completed_at && <time className="text-xs text-night-muted">{formatDate(r.completed_at)}</time>}
                </div>
                {(r.ai_report || r.notes) && <p className="mt-2 leading-relaxed text-night-text">{r.ai_report ?? r.notes}</p>}
              </li>
            ))}
          </ul>
        </div>
      )}
      <p className="mt-5 text-xs text-night-muted">
        Questions about how a sale works?{" "}
        <Link href="/#how-it-works" className="text-accent hover:underline">
          Read how AutoTrust works
        </Link>
        .
      </p>
    </Panel>
  );
}
