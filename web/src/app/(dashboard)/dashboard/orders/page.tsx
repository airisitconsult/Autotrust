"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";
import { Panel } from "@/components/dashboard/cards";
import { OrderStatusBadge, needsAction } from "@/components/dashboard/order-parts";
import { PageHeader } from "@/components/dashboard/shell";
import { ButtonLink } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/spinner";
import { useAuth } from "@/context/auth";
import { canManagePayments } from "@/lib/access";
import { assetUrl } from "@/lib/assets";
import { listOrders } from "@/lib/api";
import { cn } from "@/lib/cn";
import { formatDate, formatPrice } from "@/lib/format";
import type { Order } from "@/lib/types";

type Tab = "action" | "active" | "done" | "all";

const TABS: { id: Tab; label: string }[] = [
  { id: "action", label: "Needs action" },
  { id: "active", label: "In progress" },
  { id: "done", label: "Finished" },
  { id: "all", label: "All" },
];

function inTab(o: Order, tab: Tab): boolean {
  if (tab === "all") return true;
  if (tab === "action") return needsAction(o);
  if (tab === "done") return o.status === "completed" || o.status === "cancelled";
  return o.status !== "completed" && o.status !== "cancelled";
}

export default function OrdersPage() {
  const { user } = useAuth();
  const staff = canManagePayments(user);
  const [tab, setTab] = useState<Tab | null>(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["orders", staff ? "all" : "mine"],
    queryFn: () => listOrders({ scope: staff ? "all" : "mine" }),
    enabled: !!user,
    refetchInterval: 30_000,
  });

  // Start on "Needs action" when something needs it, otherwise show everything.
  const actionCount = data?.filter((o) => needsAction(o)).length ?? 0;
  const active: Tab = tab ?? (actionCount > 0 ? "action" : "all");
  const rows = (data ?? []).filter((o) => inTab(o, active));

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title={staff ? "Orders & payments" : "Orders"}
        subtitle={
          staff
            ? "Confirm buyers' bank transfers, track handovers and pay sellers."
            : "Cars you're buying and cars you've sold."
        }
      />

      <div role="tablist" className="no-scrollbar mb-5 flex gap-2 overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={active === t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              "flex-shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition",
              active === t.id ? "bg-accent text-white" : "bg-night-800 text-night-muted hover:text-night-text",
            )}
          >
            {t.label}
            {t.id === "action" && actionCount > 0 && (
              <span className="ml-2 rounded-full bg-white/20 px-1.5 text-xs">{actionCount}</span>
            )}
          </button>
        ))}
      </div>

      {isLoading && <Skeleton className="h-40 !bg-night-800" />}
      {isError && <p className="text-red-300">Couldn&apos;t load orders.</p>}

      {data && rows.length === 0 && (
        <Panel className="py-14 text-center">
          <p className="text-lg font-bold text-night-text">
            {data.length === 0 ? "No orders yet" : "Nothing here"}
          </p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-night-muted">
            {data.length === 0
              ? "When you buy a car, or someone buys yours, it shows up here."
              : "Try another tab."}
          </p>
          {data.length === 0 && (
            <ButtonLink href="/cars" size="sm" className="mt-5">
              Browse cars
            </ButtonLink>
          )}
        </Panel>
      )}

      <ul className="space-y-3">
        {rows.map((o) => (
          <li key={o.id}>
            <Link
              href={`/dashboard/orders/${o.id}`}
              className={cn(
                "flex items-center gap-4 rounded-2xl border bg-night-800 p-4 transition hover:bg-night-700/60",
                needsAction(o) ? "border-accent/50" : "border-night-line",
              )}
            >
              <span className="relative hidden h-16 w-24 flex-shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-brand-700 to-night-900 text-xs font-bold text-white/70 min-[420px]:flex">
                {o.vehicle.thumb_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={assetUrl(o.vehicle.thumb_url)} alt="" className="absolute inset-0 h-full w-full object-cover" />
                ) : (
                  "No photo"
                )}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-bold text-night-text">{o.vehicle.title}</p>
                <p className="truncate text-xs text-night-muted">
                  {o.reference} · {o.my_role === "buyer" ? "You're buying" : o.my_role === "seller" ? "You're selling" : `${o.buyer} → ${o.seller}`} ·{" "}
                  {formatDate(o.created_at)}
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <OrderStatusBadge status={o.status} />
                  {needsAction(o) && (
                    <span className="rounded-full bg-accent px-2.5 py-0.5 text-xs font-bold text-white">
                      {o.my_role === "staff" ? "Needs you" : "Your move"}
                    </span>
                  )}
                </div>
              </div>
              <p className="flex-shrink-0 text-lg font-extrabold text-night-text">{formatPrice(o.price)}</p>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
