"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { PageHeader } from "@/components/dashboard/shell";
import { ListingForm } from "@/components/forms/listing-form";
import { ListingStatus } from "@/components/forms/listing-status";
import { PhotoManager, SpinManager } from "@/components/forms/media-managers";
import { SuccessNote } from "@/components/ui/fields";
import { PageSpinner } from "@/components/ui/spinner";
import { useAuth } from "@/context/auth";
import { getVehicle } from "@/lib/api";

function EditListing() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const justCreated = useSearchParams().get("created") === "1";

  const { data: vehicle, isLoading, isError } = useQuery({
    queryKey: ["vehicle", id],
    queryFn: () => getVehicle(id),
  });

  if (isLoading) return <PageSpinner />;
  if (isError || !vehicle || !user) {
    return (
      <div className="mx-auto max-w-lg rounded-3xl border border-night-line bg-night-800 p-8 text-center">
        <h1 className="text-xl font-extrabold text-night-text">Listing not found</h1>
        <p className="mt-2 text-sm text-night-muted">It may have been deleted, or it isn&apos;t yours to edit.</p>
        <Link href="/dashboard/listings" className="mt-5 inline-block text-sm font-semibold text-accent">
          ← Back to listings
        </Link>
      </div>
    );
  }

  const isOwner = vehicle.owner_id === user.id;
  if (!isOwner) {
    return (
      <div className="mx-auto max-w-lg rounded-3xl border border-night-line bg-night-800 p-8 text-center">
        <h1 className="text-xl font-extrabold text-night-text">
          {vehicle.year} {vehicle.make} {vehicle.model}
        </h1>
        <p className="mt-2 text-sm text-night-muted">
          This listing belongs to someone else, so you can view it but not change it.
        </p>
        <Link href="/dashboard/listings" className="mt-5 inline-block text-sm font-semibold text-accent">
          ← Back to listings
        </Link>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title={`${vehicle.year} ${vehicle.make} ${vehicle.model}`}
        subtitle={`${vehicle.lga}, ${vehicle.state} · VIN ${vehicle.vin}`}
        actions={
          <Link href="/dashboard/listings" className="text-sm font-semibold text-night-muted hover:text-night-text">
            ← All listings
          </Link>
        }
      />
      {justCreated && (
        <div className="mb-5">
          <SuccessNote>
            Listing created. Now add photos (and a 360° view if you can), then request an inspection so it can go on
            sale.
          </SuccessNote>
        </div>
      )}

      <div className="grid gap-5 xl:grid-cols-[1fr_22rem]">
        <div className="space-y-5">
          <PhotoManager vehicle={vehicle} />
          <SpinManager vehicle={vehicle} />
          <ListingForm vehicle={vehicle} />
        </div>
        <div className="xl:sticky xl:top-24 xl:self-start">
          <ListingStatus vehicle={vehicle} />
        </div>
      </div>
    </div>
  );
}

export default function EditListingPage() {
  return (
    <Suspense fallback={<PageSpinner />}>
      <EditListing />
    </Suspense>
  );
}
