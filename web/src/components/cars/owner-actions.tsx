"use client";

import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, ButtonLink } from "@/components/ui/button";
import { ErrorNote } from "@/components/ui/fields";
import { useAuth } from "@/context/auth";
import { extractErrorMessage, updateVehicle } from "@/lib/api";
import type { Vehicle } from "@/lib/types";

/** Shown only to the person who owns the listing. The page itself is rendered
 * for everyone on the server, so ownership is checked here once the visitor's
 * login is known (the server enforces it again on every request). Everything
 * heavier lives in the dashboard. */
export function OwnerActions({ vehicle }: { vehicle: Vehicle }) {
  const { user } = useAuth();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  const withdraw = useMutation({
    mutationFn: () => updateVehicle(vehicle.id, { status: "draft" }),
    onSuccess: () => router.push(`/dashboard/listings/${vehicle.id}/edit`),
    onError: (err) => setError(extractErrorMessage(err)),
  });

  if (!user || user.id !== vehicle.owner_id) return null;

  return (
    <div className="space-y-2.5 rounded-2xl bg-ink-50 p-4 ring-1 ring-ink-200/70">
      <p className="text-xs font-bold uppercase tracking-wide text-ink-400">Your listing</p>
      {error && <ErrorNote>{error}</ErrorNote>}
      <ButtonLink href={`/dashboard/listings/${vehicle.id}/edit`} className="w-full">
        Manage this listing
      </ButtonLink>
      {vehicle.status === "listed" && (
        <Button
          variant="secondary"
          className="w-full"
          onClick={() => withdraw.mutate()}
          disabled={withdraw.isPending}
        >
          {withdraw.isPending ? "Withdrawing…" : "Withdraw from sale"}
        </Button>
      )}
      {(vehicle.status === "reserved" || vehicle.status === "sold") && (
        <ButtonLink href="/dashboard/orders" variant="secondary" className="w-full">
          View the order
        </ButtonLink>
      )}
    </div>
  );
}
