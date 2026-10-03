import Link from "next/link";
import { ConditionBadge, VettedBadge } from "@/components/ui/badge";
import { assetUrl } from "@/lib/assets";
import { cn } from "@/lib/cn";
import { formatMileage, formatPrice, titleCase } from "@/lib/format";
import type { Vehicle } from "@/lib/types";

// Deterministic fallback gradient per car, for listings without photos yet.
const gradients = [
  "from-brand-800 to-brand-950",
  "from-ink-700 to-ink-950",
  "from-brand-600 to-ink-900",
  "from-trust-700 to-ink-900",
  "from-brand-700 to-ink-950",
];

function PinIcon() {
  return (
    <svg className="h-3.5 w-3.5 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
      <path
        fillRule="evenodd"
        d="M9.69 18.93a.75.75 0 00.62 0C13.4 17.5 17 13.4 17 8.5a7 7 0 10-14 0c0 4.9 3.6 9 6.69 10.43zM10 11.25a2.75 2.75 0 100-5.5 2.75 2.75 0 000 5.5z"
        clipRule="evenodd"
      />
    </svg>
  );
}

export function VehicleCard({
  vehicle,
  highlight,
  className,
}: {
  vehicle: Vehicle;
  /** Small label on the photo, e.g. "Recommended". */
  highlight?: string;
  className?: string;
}) {
  const cover = vehicle.photos[0];
  const gradient = gradients[vehicle.id.charCodeAt(0) % gradients.length];
  const name = `${vehicle.year} ${vehicle.make} ${vehicle.model}`;

  return (
    <Link
      href={`/cars/${vehicle.id}`}
      className={cn(
        "group flex flex-col overflow-hidden rounded-2xl border border-ink-200/80 bg-white shadow-card transition duration-300 hover:-translate-y-1 hover:shadow-lift",
        className,
      )}
    >
      <div className={cn("relative aspect-[4/3] overflow-hidden bg-gradient-to-br", gradient)}>
        {cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={assetUrl(cover.thumb_url)}
            alt={name}
            loading="lazy"
            className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-5xl font-black tracking-tight text-white/85">
              {vehicle.make[0]}
              {vehicle.model[0]}
            </span>
          </div>
        )}
        <div className="absolute inset-x-0 top-0 flex items-start justify-between gap-2 p-3">
          {vehicle.is_vetted ? <VettedBadge /> : <span />}
          {vehicle.status === "sold" && (
            <span className="rounded-full bg-ink-950/80 px-2.5 py-0.5 text-xs font-semibold text-white">
              Sold
            </span>
          )}
        </div>
        {highlight && (
          <span className="absolute bottom-3 left-3 rounded-full bg-gold-400 px-2.5 py-0.5 text-xs font-bold text-ink-950 shadow">
            {highlight}
          </span>
        )}
        {vehicle.photos.length > 1 && (
          <span className="absolute bottom-3 right-3 rounded-full bg-ink-950/70 px-2 py-0.5 text-xs font-medium text-white backdrop-blur">
            {vehicle.photos.length} photos
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-2.5 p-4">
        <div className="flex items-start justify-between gap-3">
          <h3 className="font-bold leading-snug text-ink-900 transition group-hover:text-brand-700">
            {name}
          </h3>
          <ConditionBadge condition={vehicle.condition} />
        </div>

        <p className="flex items-center gap-1 text-sm text-ink-500">
          <PinIcon />
          <span className="truncate">
            {vehicle.lga}, {vehicle.state}
          </span>
          <span aria-hidden>·</span>
          <span className="whitespace-nowrap">{formatMileage(vehicle.mileage)}</span>
        </p>

        {vehicle.features.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {vehicle.features.slice(0, 2).map((f) => (
              <span key={f} className="rounded-md bg-ink-100 px-2 py-0.5 text-xs text-ink-600">
                {titleCase(f)}
              </span>
            ))}
            {vehicle.features.length > 2 && (
              <span className="rounded-md bg-ink-100 px-2 py-0.5 text-xs text-ink-500">
                +{vehicle.features.length - 2}
              </span>
            )}
          </div>
        )}

        <div className="mt-auto flex items-end justify-between pt-1">
          <p className="text-xl font-extrabold tracking-tight text-ink-950">{formatPrice(vehicle.price)}</p>
          <span className="text-sm font-semibold text-brand-600 transition group-hover:translate-x-0.5">
            View &rarr;
          </span>
        </div>
      </div>
    </Link>
  );
}
