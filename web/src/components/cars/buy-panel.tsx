"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, ButtonLink } from "@/components/ui/button";
import { ErrorNote, SuccessNote, Textarea } from "@/components/ui/fields";
import { useAuth } from "@/context/auth";
import { createOrder, extractErrorMessage, getPlatformInfo, startEnquiry } from "@/lib/api";
import { formatPrice } from "@/lib/format";
import type { Vehicle } from "@/lib/types";

/** What a visitor can do about a car: buy it, or ask the seller a question.
 * Both need a verified account; the server enforces that, this just explains it. */
export function BuyPanel({ vehicle }: { vehicle: Vehicle }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [mode, setMode] = useState<"idle" | "buy" | "enquire">("idle");
  const [message, setMessage] = useState("Hi, is this car still available? I'd like to know more.");
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { data: platform } = useQuery({ queryKey: ["platform"], queryFn: getPlatformInfo, staleTime: 60_000 });

  const buy = useMutation({
    mutationFn: () => createOrder(vehicle.id),
    onSuccess: (order) => router.push(`/dashboard/orders/${order.id}`),
    onError: (err) => setError(extractErrorMessage(err)),
  });

  const enquire = useMutation({
    mutationFn: () => startEnquiry(vehicle.id, message),
    onSuccess: (thread) => {
      setError(null);
      setSentTo(thread.id);
      setMode("idle");
    },
    onError: (err) => setError(extractErrorMessage(err)),
  });

  if (vehicle.status === "sold") {
    return (
      <p className="rounded-2xl bg-ink-100 p-4 text-sm font-medium text-ink-700">This car has been sold.</p>
    );
  }
  if (vehicle.status === "reserved") {
    return (
      <p className="rounded-2xl bg-gold-100 p-4 text-sm font-medium text-gold-700">
        A buyer is completing the purchase of this car. If it falls through it will be back on sale.
      </p>
    );
  }
  if (loading) return <div className="h-24" />;
  if (user && user.id === vehicle.owner_id) return null;

  const here = `/cars/${vehicle.id}`;

  // Not signed in: send them to log in, then straight back here.
  if (!user) {
    return (
      <div className="space-y-2.5">
        <ButtonLink href={`/login?next=${encodeURIComponent(here)}`} size="lg" className="w-full">
          Log in to buy or enquire
        </ButtonLink>
        <p className="text-center text-sm text-ink-500">
          New here?{" "}
          <Link href={`/register?next=${encodeURIComponent(here)}`} className="font-semibold text-brand-600">
            Create a free account
          </Link>
        </p>
      </div>
    );
  }

  if (!user.email_verified) {
    return (
      <p className="rounded-2xl bg-gold-100 p-4 text-sm text-gold-700">
        <strong>Verify your email to buy or enquire.</strong> We sent a link to {user.email}. Use the banner
        at the top of the page to send it again.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {sentTo && (
        <SuccessNote>
          Message sent.{" "}
          <Link href={`/dashboard/enquiries/${sentTo}`} className="font-semibold underline">
            Open the conversation
          </Link>
        </SuccessNote>
      )}
      {error && <ErrorNote>{error}</ErrorNote>}

      {mode === "buy" ? (
        <div className="rounded-2xl border border-brand-200 bg-brand-50/60 p-4">
          <p className="font-bold text-ink-950">Buy this car for {formatPrice(vehicle.price)}</p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-ink-700">
            <li>The car is reserved for you right away.</li>
            <li>You pay by bank transfer to AutoTrust, using a reference we give you.</li>
            <li>We hold your money until you confirm you have the car.</li>
          </ul>
          <div className="mt-4 flex gap-2">
            <Button className="flex-1" onClick={() => buy.mutate()} disabled={buy.isPending}>
              {buy.isPending ? "Reserving…" : "Reserve and continue"}
            </Button>
            <Button variant="secondary" onClick={() => setMode("idle")}>
              Back
            </Button>
          </div>
        </div>
      ) : mode === "enquire" ? (
        <div className="rounded-2xl border border-ink-200 bg-white p-4">
          <label htmlFor="enquiry" className="text-sm font-bold text-ink-950">
            Message the seller
          </label>
          <Textarea
            id="enquiry"
            rows={4}
            maxLength={1000}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="mt-2"
          />
          <p className="mt-1 text-xs text-ink-500">Your email address stays private.</p>
          <div className="mt-3 flex gap-2">
            <Button
              className="flex-1"
              onClick={() => enquire.mutate()}
              disabled={enquire.isPending || !message.trim()}
            >
              {enquire.isPending ? "Sending…" : "Send message"}
            </Button>
            <Button variant="secondary" onClick={() => setMode("idle")}>
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <>
          <Button
            size="lg"
            className="w-full"
            disabled={platform ? !platform.payments_enabled : false}
            onClick={() => {
              setError(null);
              setMode("buy");
            }}
          >
            Buy this car
          </Button>
          {platform && !platform.payments_enabled && (
            <p className="text-center text-xs text-ink-500">
              Online purchases aren&apos;t switched on yet. You can still message the seller.
            </p>
          )}
          <Button
            size="lg"
            variant="secondary"
            className="w-full"
            onClick={() => {
              setError(null);
              setSentTo(null);
              setMode("enquire");
            }}
          >
            Send an enquiry
          </Button>
        </>
      )}
    </div>
  );
}
