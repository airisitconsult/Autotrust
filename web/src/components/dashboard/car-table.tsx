import Link from "next/link";
import { Panel, PanelTitle } from "@/components/dashboard/cards";
import { StatusBadge, VettedBadge } from "@/components/ui/badge";
import { assetUrl } from "@/lib/assets";
import { formatDate, formatPrice } from "@/lib/format";
import type { Vehicle } from "@/lib/types";

function Thumb({ vehicle }: { vehicle: Vehicle }) {
  const cover = vehicle.photos[0];
  return (
    <span className="relative flex h-11 w-16 flex-shrink-0 items-center justify-center overflow-hidden rounded-lg bg-gradient-to-br from-brand-700 to-night-900 text-sm font-black text-white/80">
      {cover ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={assetUrl(cover.thumb_url)} alt="" className="absolute inset-0 h-full w-full object-cover" />
      ) : (
        <>
          {vehicle.make[0]}
          {vehicle.model[0]}
        </>
      )}
    </span>
  );
}

/** "Top listings"-style table: a real table on wide screens, stacked rows on phones. */
export function CarTable({
  title,
  vehicles,
  hrefFor,
  actionLabel,
  action,
  empty,
}: {
  title: string;
  vehicles: Vehicle[];
  hrefFor: (v: Vehicle) => string;
  actionLabel: string;
  action?: React.ReactNode;
  empty: string;
}) {
  return (
    <Panel>
      <PanelTitle action={action}>{title}</PanelTitle>
      {vehicles.length === 0 ? (
        <p className="py-8 text-center text-sm text-night-muted">{empty}</p>
      ) : (
        <>
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-[40rem] text-left text-sm">
              <thead>
                <tr className="border-b border-night-line text-xs font-semibold uppercase tracking-wide text-night-muted">
                  <th className="pb-3 pr-4 font-semibold">Car</th>
                  <th className="pb-3 pr-4 font-semibold">Location</th>
                  <th className="pb-3 pr-4 font-semibold">Added</th>
                  <th className="pb-3 pr-4 font-semibold">Price</th>
                  <th className="pb-3 pr-4 font-semibold">Status</th>
                  <th className="pb-3 text-right font-semibold" />
                </tr>
              </thead>
              <tbody className="divide-y divide-night-line">
                {vehicles.map((v) => (
                  <tr key={v.id} className="transition hover:bg-night-700/40">
                    <td className="py-3 pr-4">
                      <div className="flex items-center gap-3">
                        <Thumb vehicle={v} />
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-night-text">
                            {v.year} {v.make} {v.model}
                          </p>
                          <p className="truncate text-xs text-night-muted">{v.vin}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 pr-4 text-night-muted">
                      {v.lga}, {v.state}
                    </td>
                    <td className="py-3 pr-4 text-night-muted">{formatDate(v.created_at)}</td>
                    <td className="py-3 pr-4 font-semibold text-night-text">{formatPrice(v.price)}</td>
                    <td className="py-3 pr-4">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <StatusBadge status={v.status} />
                        {v.is_vetted && <VettedBadge className="!px-2 !text-[11px]" />}
                      </div>
                    </td>
                    <td className="py-3 text-right">
                      <Link href={hrefFor(v)} className="text-sm font-semibold text-accent hover:underline">
                        {actionLabel}
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <ul className="space-y-3 md:hidden">
            {vehicles.map((v) => (
              <li key={v.id}>
                <Link
                  href={hrefFor(v)}
                  className="flex items-center gap-3 rounded-2xl border border-night-line bg-night-900 p-3 transition hover:bg-night-700/50"
                >
                  <Thumb vehicle={v} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-night-text">
                      {v.year} {v.make} {v.model}
                    </p>
                    <p className="truncate text-xs text-night-muted">
                      {v.lga}, {v.state}
                    </p>
                    <div className="mt-1.5 flex items-center gap-2">
                      <StatusBadge status={v.status} />
                      <span className="text-sm font-bold text-night-text">{formatPrice(v.price)}</span>
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </Panel>
  );
}
