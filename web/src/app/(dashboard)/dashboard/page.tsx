"use client";

import { useQuery } from "@tanstack/react-query";
import { BarList, ChartCard, MiniStat, Panel, PanelTitle } from "@/components/dashboard/cards";
import { CarTable } from "@/components/dashboard/car-table";
import { FeaturedCar } from "@/components/dashboard/featured-car";
import { PageHeader } from "@/components/dashboard/shell";
import { ButtonLink } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/spinner";
import { useAuth } from "@/context/auth";
import { canListCars, canManagePayments } from "@/lib/access";
import { getDashboardSummary, listVehicles } from "@/lib/api";
import { formatCompactPrice } from "@/lib/format";
import type { DashboardSummary, Vehicle } from "@/lib/types";

function asSeries(points: { label: string; count: number }[]) {
  return points.map((p) => ({ label: p.label, value: p.count }));
}

export default function OverviewPage() {
  const { user } = useAuth();
  const { data: summary, isLoading, isError } = useQuery({
    queryKey: ["dashboard-summary"],
    queryFn: getDashboardSummary,
  });

  const isInspector = user?.role === "inspector";
  const isBuyer = user?.role === "buyer";
  const platform = summary?.scope === "platform";

  // People with no cars of their own (buyers) get the newest cars on the site instead.
  const ownCars = summary?.recent_listings ?? [];
  const { data: latest } = useQuery({
    queryKey: ["latest-public-cars"],
    queryFn: () => listVehicles({ limit: 6 }),
    enabled: !!summary && ownCars.length === 0 && !isInspector,
  });
  const cars: Vehicle[] = ownCars.length > 0 ? ownCars : isInspector ? [] : (latest ?? []);
  const showingPublic = ownCars.length === 0 && !isInspector;

  if (isLoading || !summary || !user) {
    return (
      <div className="space-y-5">
        <Skeleton className="h-10 w-72 !bg-night-700" />
        <div className="grid gap-5 xl:grid-cols-3">
          <Skeleton className="h-64 !bg-night-800 xl:col-span-1" />
          <Skeleton className="h-64 !bg-night-800 xl:col-span-1" />
          <Skeleton className="h-64 !bg-night-800 xl:col-span-1" />
        </div>
      </div>
    );
  }
  if (isError) {
    return <p className="rounded-2xl bg-red-500/10 p-4 text-red-300">Couldn&apos;t load your dashboard. Is the backend running?</p>;
  }

  const s = summary.stats;
  const name = user.email.split("@")[0];
  const passRate = s.inspections_completed > 0 ? Math.round((s.inspections_passed / s.inspections_completed) * 100) : 0;

  // --- the two big cards, by role ---
  const cardA = isInspector ? (
    <ChartCard
      title="Inspections completed"
      value={String(s.inspections_completed)}
      caption={`${s.inspections_passed} passed · ${s.inspections_completed - s.inspections_passed} failed`}
      data={asSeries(summary.inspections_series)}
      color="#4d7bff"
    />
  ) : isBuyer ? (
    <ChartCard
      title="Open orders"
      value={String(s.orders_open)}
      caption="Cars you are buying right now"
      footer={
        <ButtonLink href="/dashboard/orders" size="sm" variant="secondary">
          View my orders
        </ButtonLink>
      }
    />
  ) : (
    <ChartCard
      title={platform ? "Total sales" : "My sales"}
      value={formatCompactPrice(s.sales_volume)}
      caption={
        platform
          ? `${formatCompactPrice(s.earnings)} earned in fees · ${formatCompactPrice(s.earnings_pending)} owed to sellers`
          : `${formatCompactPrice(s.earnings)} received · ${formatCompactPrice(s.earnings_pending)} on its way`
      }
      data={summary.sales_series.map((p) => ({ label: p.label, value: p.amount }))}
      formatValue={formatCompactPrice}
      color="#4d7bff"
    />
  );

  const cardB = isInspector ? (
    <ChartCard
      title="Waiting for inspection"
      value={String(s.inspections_pending)}
      caption={`Your pass rate is ${passRate}%`}
      footer={
        <ButtonLink href="/dashboard/inspections" size="sm">
          Open the queue
        </ButtonLink>
      }
    />
  ) : isBuyer ? (
    <ChartCard
      title="Unread messages"
      value={String(s.unread_enquiries)}
      caption="Replies from sellers"
      footer={
        <ButtonLink href="/dashboard/enquiries" size="sm" variant="secondary">
          Open my inbox
        </ButtonLink>
      }
    />
  ) : (
    <ChartCard
      title={platform ? "New listings" : "My listings"}
      value={String(s.listings_total)}
      caption={`${s.listings_active} for sale · ${s.vetted} vetted`}
      data={asSeries(summary.listings_series)}
      color="#43c97b"
    />
  );

  // --- the small tiles, by role ---
  const tiles = isInspector
    ? [
        <MiniStat key="p" label="In the queue" value={s.inspections_pending} icon="clipboard" tone="amber" />,
        <MiniStat key="c" label="Completed" value={s.inspections_completed} icon="check" tone="green" />,
        <MiniStat key="r" label="Pass rate" value={`${passRate}%`} icon="shield" />,
        <MiniStat key="e" label="Unread messages" value={s.unread_enquiries} icon="chat" />,
      ]
    : isBuyer
      ? [
          <MiniStat key="o" label="Open orders" value={s.orders_open} icon="receipt" />,
          <MiniStat key="e" label="Unread messages" value={s.unread_enquiries} icon="chat" tone="amber" />,
        ]
      : [
          <MiniStat key="a" label="For sale" value={s.listings_active} icon="car" hint={`${formatCompactPrice(s.active_value)} total`} />,
          <MiniStat key="v" label="Vetted" value={s.vetted} icon="shield" tone="green" />,
          <MiniStat key="s" label="Sold" value={s.listings_sold} icon="tag" tone="amber" />,
          <MiniStat key="o" label="Open orders" value={s.orders_open} icon="receipt" />,
          <MiniStat key="e" label="Unread messages" value={s.unread_enquiries} icon="chat" />,
          ...(platform
            ? [
                <MiniStat key="u" label="Users" value={s.users_total ?? 0} icon="users" />,
                <MiniStat key="i" label="Awaiting inspection" value={s.inspections_pending} icon="clipboard" tone="amber" />,
              ]
            : [<MiniStat key="i" label="Inspections passed" value={s.inspections_passed} icon="clipboard" tone="green" />]),
          ...(s.payments_to_confirm !== null
            ? [
                <MiniStat key="pc" label="Payments to confirm" value={s.payments_to_confirm} icon="wallet" tone={s.payments_to_confirm > 0 ? "red" : "green"} />,
                <MiniStat key="pd" label="Payouts due" value={s.payouts_due ?? 0} icon="wallet" tone={(s.payouts_due ?? 0) > 0 ? "amber" : "green"} />,
              ]
            : []),
        ];

  const manage = (v: Vehicle) =>
    !showingPublic && (canListCars(user) || platform) ? `/dashboard/listings/${v.id}/edit` : `/cars/${v.id}`;

  const subtitle = platform
    ? "Here's how the whole marketplace is doing."
    : isInspector
      ? "Your inspections at a glance."
      : isBuyer
        ? "Track your orders and messages."
        : "Here's how your listings and sales are doing.";

  const actions = (
    <>
      {canListCars(user) && (
        <ButtonLink href="/dashboard/listings/new" size="sm">
          {user.role === "super_admin" ? "+ Add company car" : "+ List a car"}
        </ButtonLink>
      )}
      {canManagePayments(user) && (s.payments_to_confirm ?? 0) > 0 && (
        <ButtonLink href="/dashboard/orders" size="sm" variant="secondary">
          {s.payments_to_confirm} payment{s.payments_to_confirm === 1 ? "" : "s"} to confirm
        </ButtonLink>
      )}
      <ButtonLink href="/cars" size="sm" variant="secondary">
        Browse cars
      </ButtonLink>
    </>
  );

  return (
    <div>
      <PageHeader title={`Welcome back, ${name}`} subtitle={subtitle} actions={actions} />

      <div className="grid gap-5 xl:grid-cols-3">
        <div className="space-y-5 xl:col-span-2">
          <div className="grid gap-5 md:grid-cols-2">
            {cardA}
            {cardB}
          </div>

          <div className="grid grid-cols-1 gap-3 min-[480px]:grid-cols-2 lg:grid-cols-3">{tiles}</div>

          {!isInspector && !isBuyer && (
            <Panel>
              <PanelTitle>{platform ? "Cars for sale by state" : "Where your cars are"}</PanelTitle>
              <BarList items={summary.by_state.map((x) => ({ label: x.state, value: x.count }))} />
            </Panel>
          )}
        </div>

        <FeaturedCar
          vehicles={cars}
          title={isInspector ? "Next to inspect" : showingPublic ? "Latest on AutoTrust" : "Recent car listings"}
          hrefFor={isInspector ? () => "/dashboard/inspections" : manage}
          cta={isInspector ? "Open the queue" : showingPublic ? "View the car" : "Manage this car"}
        />
      </div>

      <div className="mt-5">
        <CarTable
          title={isInspector ? "Awaiting inspection" : showingPublic ? "Newest cars" : platform ? "Latest listings" : "My latest listings"}
          vehicles={cars}
          hrefFor={isInspector ? () => "/dashboard/inspections" : manage}
          actionLabel={isInspector ? "Inspect" : showingPublic ? "View" : "Manage"}
          empty={isInspector ? "Nothing is waiting. Nice work." : "No cars yet."}
          action={
            !isInspector && (
              <ButtonLink href={showingPublic ? "/cars" : "/dashboard/listings"} size="sm" variant="secondary">
                View all
              </ButtonLink>
            )
          }
        />
      </div>
    </div>
  );
}
