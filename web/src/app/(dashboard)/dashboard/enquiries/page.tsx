"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Panel } from "@/components/dashboard/cards";
import { PageHeader } from "@/components/dashboard/shell";
import { ButtonLink } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/spinner";
import { assetUrl } from "@/lib/assets";
import { listEnquiries } from "@/lib/api";
import { cn } from "@/lib/cn";
import { formatDate } from "@/lib/format";

export default function EnquiriesPage() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["enquiries"],
    queryFn: listEnquiries,
    refetchInterval: 30_000,
  });

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Enquiries" subtitle="Messages between buyers and sellers. Email addresses stay private." />

      {isLoading && <Skeleton className="h-48 !bg-night-800" />}
      {isError && <p className="text-red-300">Couldn&apos;t load your messages.</p>}

      {data && data.length === 0 && (
        <Panel className="py-14 text-center">
          <p className="text-lg font-bold text-night-text">No conversations yet</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-night-muted">
            Open a car and tap “Send an enquiry” to ask the seller a question. Buyers&apos; messages about your cars
            show up here too.
          </p>
          <ButtonLink href="/cars" className="mt-5" size="sm">
            Browse cars
          </ButtonLink>
        </Panel>
      )}

      {data && data.length > 0 && (
        <Panel className="!p-0 overflow-hidden">
          <ul className="divide-y divide-night-line">
            {data.map((e) => (
              <li key={e.id}>
                <Link
                  href={`/dashboard/enquiries/${e.id}`}
                  className={cn(
                    "flex items-center gap-4 px-4 py-4 transition hover:bg-night-700/40 sm:px-5",
                    e.unread && "bg-accent/5",
                  )}
                >
                  <span className="relative flex h-14 w-20 flex-shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-brand-700 to-night-900 text-xs font-bold text-white/70">
                    {e.vehicle.thumb_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={assetUrl(e.vehicle.thumb_url)} alt="" className="absolute inset-0 h-full w-full object-cover" />
                    ) : (
                      "No photo"
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className={cn("truncate text-night-text", e.unread ? "font-extrabold" : "font-semibold")}>
                        {e.vehicle.title}
                      </p>
                      {e.unread && <span className="h-2 w-2 flex-shrink-0 rounded-full bg-accent" aria-label="Unread" />}
                    </div>
                    <p className="truncate text-xs text-night-muted">
                      {e.my_role === "seller" ? `Buyer ${e.counterparty}` : "Seller"} · {e.vehicle.location}
                    </p>
                    <p className={cn("mt-0.5 truncate text-sm", e.unread ? "text-night-text" : "text-night-muted")}>
                      {e.last_message_preview}
                    </p>
                  </div>
                  <time className="flex-shrink-0 text-xs text-night-muted">{formatDate(e.last_message_at)}</time>
                </Link>
              </li>
            ))}
          </ul>
        </Panel>
      )}
    </div>
  );
}
