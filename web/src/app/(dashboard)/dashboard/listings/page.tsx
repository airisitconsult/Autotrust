"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AdminListings } from "@/components/dashboard/admin-listings";
import { CarTable } from "@/components/dashboard/car-table";
import { PageHeader } from "@/components/dashboard/shell";
import { Panel } from "@/components/dashboard/cards";
import { Button, ButtonLink } from "@/components/ui/button";
import { ErrorNote } from "@/components/ui/fields";
import { PageSpinner } from "@/components/ui/spinner";
import { useAuth } from "@/context/auth";
import { canListCars, canViewAllListings } from "@/lib/access";
import { becomeSeller, extractErrorMessage, listMyVehicles } from "@/lib/api";

function SellerListings() {
  const { data, isLoading } = useQuery({ queryKey: ["my-vehicles"], queryFn: listMyVehicles });
  if (isLoading) return <PageSpinner />;
  return (
    <CarTable
      title="Your cars"
      vehicles={data ?? []}
      hrefFor={(v) => `/dashboard/listings/${v.id}/edit`}
      actionLabel="Manage"
      empty="You haven't listed a car yet. Tap “List a car” to start."
    />
  );
}

function BecomeSeller() {
  const { refreshUser } = useAuth();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const mutation = useMutation({
    mutationFn: becomeSeller,
    onSuccess: async () => {
      await refreshUser();
      router.push("/dashboard/listings/new");
    },
    onError: (err) => setError(extractErrorMessage(err)),
  });

  return (
    <Panel className="mx-auto max-w-xl text-center">
      <h2 className="text-xl font-extrabold text-night-text">Sell your car on AutoTrust</h2>
      <ul className="mx-auto mt-4 max-w-sm space-y-2 text-left text-sm text-night-muted">
        <li>✓ We inspect it in person, so buyers trust it.</li>
        <li>✓ Buyers pay AutoTrust, and you receive 95% once they have the car.</li>
        <li>✓ Free to list. AutoTrust keeps 5% only when it sells.</li>
      </ul>
      {error && (
        <div className="mt-4">
          <ErrorNote>{error}</ErrorNote>
        </div>
      )}
      <Button size="lg" className="mt-6" onClick={() => mutation.mutate()} disabled={mutation.isPending}>
        {mutation.isPending ? "Switching…" : "Switch to a seller account"}
      </Button>
    </Panel>
  );
}

export default function ListingsPage() {
  const { user } = useAuth();
  if (!user) return null;

  const staffView = canViewAllListings(user);
  const seller = canListCars(user);

  return (
    <div>
      <PageHeader
        title={staffView ? "Listings" : seller ? "My listings" : "Sell a car"}
        subtitle={
          staffView
            ? "Every car on the platform, from sellers and from AutoTrust."
            : seller
              ? "Cars you've listed. A car goes on sale after it passes inspection."
              : undefined
        }
        actions={
          seller && !staffView ? (
            <ButtonLink href="/dashboard/listings/new" size="sm">
              + List a car
            </ButtonLink>
          ) : undefined
        }
      />
      {staffView ? (
        <AdminListings canAddCompanyCar={user.role === "super_admin"} />
      ) : seller ? (
        <SellerListings />
      ) : (
        <BecomeSeller />
      )}
    </div>
  );
}
