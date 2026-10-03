import Link from "next/link";
import { ConditionBadge, VettedBadge } from "@/components/ui/badge";
import { assetUrl } from "@/lib/assets";
import { cn } from "@/lib/cn";
import { formatMileage, formatPrice, titleCase } from "@/lib/format";
import { BODY_TYPE_LABELS, hasSpin, type Vehicle } from "@/lib/types";

const gradients = [
  "from-brand-800 to-brand-950",
  "from-ink-700 to-ink-950",
  "from-brand-600 to-ink-900",
  "from-trust-700 to-ink-900",
  "from-brand-700 to-ink-950",
];

/** The list-view card: a wide row with the photo on the left and the details
 * and price on the right. On phones it becomes a compact picture-and-text row. */
export function VehicleRow({ vehicle, highlight }: { vehicle: Vehicle; highlight?: string }) {
  const cover = vehicle.photos[0];
  const gradient = gradients[vehicle.id.charCodeAt(0) % gradients.length];
  const name = `${vehicle.year} ${vehicle.make} ${vehicle.model}`;
  const body = vehicle.body_type ? BODY_TYPE_LABELS[vehicle.body_type] : null;
  const facts = [body, formatMileage(vehicle.mileage), `${vehicle.lga}, ${vehicle.state}`].filter(Boolean);

  return (
    <Link
      href={`/cars/${vehicle.id}`}
      className="group flex overflow-hidden rounded-2xl border border-ink-200/80 bg-white shadow-card transition duration-300 hover:shadow-lift sm:rounded-3xl"
    >
      <div
        className={cn(
          "relative w-32 flex-shrink-0 overflow-hidden bg-gradient-to-br min-[480px]:w-44 sm:w-64 lg:w-72",
          gradient,
        )}
      >
        {cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={assetUrl(cover.thumb_url)}
            alt={name}
            loading="lazy"
            className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-3xl font-black text-white/85 sm:text-5xl">
            {vehicle.make[0]}
            {vehicle.model[0]}
          </div>
        )}
        {vehicle.is_vetted && (
          <span className="absolute left-2 top-2 hidden sm:block">
            <VettedBadge />
          </span>
        )}
        {highlight && (
          <span className="absolute bottom-2 left-2 rounded-full bg-gold-400 px-2 py-0.5 text-[11px] font-bold text-ink-950 shadow">
            {highlight}
          </span>
        )}
        {vehicle.photos.length > 1 && (
          <span className="absolute bottom-2 right-2 hidden rounded-full bg-ink-950/70 px-2 py-0.5 text-xs font-medium text-white sm:block">
            {vehicle.photos.length} photos
          </span>
        )}
      </div>

      <div className="flex min-w-0 flex-1 flex-col justify-between gap-3 p-3.5 sm:flex-row sm:p-5">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            {vehicle.is_vetted && (
              <span className="inline-flex items-center gap-1 rounded-full bg-trust-500 px-2 py-0.5 text-[11px] font-bold text-white sm:hidden">
                ✓ Vetted
              </span>
            )}
            <ConditionBadge condition={vehicle.condition} />
            {hasSpin(vehicle) && (
              <span className="rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-semibold text-brand-700">
                360° view
              </span>
            )}
          </div>
          <h3 className="mt-2 text-base font-extrabold leading-snug text-ink-950 transition group-hover:text-brand-700 sm:text-xl">
            {name}
          </h3>
          <p className="mt-1 text-sm text-ink-500">{facts.join(" · ")}</p>
          {vehicle.features.length > 0 && (
            <div className="mt-3 hidden flex-wrap gap-1.5 sm:flex">
              {vehicle.features.slice(0, 4).map((f) => (
                <span key={f} className="rounded-md bg-ink-100 px-2 py-0.5 text-xs text-ink-600">
                  {titleCase(f)}
                </span>
              ))}
              {vehicle.features.length > 4 && (
                <span className="rounded-md bg-ink-100 px-2 py-0.5 text-xs text-ink-500">
                  +{vehicle.features.length - 4} more
                </span>
              )}
            </div>
          )}
        </div>

        <div className="flex items-end justify-between gap-3 sm:flex-col sm:items-end sm:justify-between">
          <p className="text-xl font-extrabold tracking-tight text-ink-950 sm:text-2xl">
            {formatPrice(vehicle.price)}
          </p>
          <span className="hidden rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition group-hover:bg-brand-700 sm:inline-block">
            View details
          </span>
        </div>
      </div>
    </Link>
  );
}
