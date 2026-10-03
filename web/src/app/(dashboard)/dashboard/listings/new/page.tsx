"use client";

import Link from "next/link";
import { PageHeader } from "@/components/dashboard/shell";
import { ListingForm } from "@/components/forms/listing-form";
import { ButtonLink } from "@/components/ui/button";
import { useAuth } from "@/context/auth";
import { canListCars } from "@/lib/access";

export default function NewListingPage() {
  const { user } = useAuth();
  const company = user?.role === "super_admin";

  if (user && !canListCars(user)) {
    return (
      <div className="mx-auto max-w-lg rounded-3xl border border-night-line bg-night-800 p-8 text-center">
        <h1 className="text-xl font-extrabold text-night-text">Only seller accounts can list cars</h1>
        <p className="mt-2 text-sm text-night-muted">Switch to a seller account to list your car.</p>
        <ButtonLink href="/dashboard/listings" className="mt-6">
          Become a seller
        </ButtonLink>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title={company ? "Add a company car" : "List a car"}
        subtitle={
          company
            ? "Cars listed by AutoTrust go on sale immediately and are marked Vetted."
            : "Tell buyers about your car. It goes on sale after it passes an AutoTrust inspection."
        }
        actions={
          <Link href="/dashboard/listings" className="text-sm font-semibold text-night-muted hover:text-night-text">
            ← Back
          </Link>
        }
      />
      <ListingForm />
    </div>
  );
}
