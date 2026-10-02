import { Link } from "react-router-dom";
import { assetUrl } from "../api/client";
import type { Vehicle } from "../types";
import { ConditionBadge, VettedBadge } from "./Badge";

function formatPrice(price: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(price);
}

function formatMileage(mileage: number) {
  return `${new Intl.NumberFormat("en-US").format(mileage)} km`;
}

// Deterministic placeholder gradient per vehicle, shown when the seller
// hasn't uploaded any photos yet.
const gradients = [
  "from-slate-700 to-slate-900",
  "from-brand-700 to-brand-900",
  "from-emerald-700 to-emerald-900",
  "from-amber-700 to-amber-900",
  "from-rose-700 to-rose-900",
];

export function VehicleCard({ vehicle, highlight }: { vehicle: Vehicle; highlight?: string }) {
  const gradient = gradients[vehicle.id.charCodeAt(0) % gradients.length];
  const cover = vehicle.photos[0];

  return (
    <Link
      to={`/vehicles/${vehicle.id}`}
      className="group flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg"
    >
      <div className={`relative flex h-40 items-center justify-center bg-gradient-to-br ${gradient} sm:h-48`}>
        {cover ? (
          <img
            src={assetUrl(cover.thumb_url)}
            alt={`${vehicle.year} ${vehicle.make} ${vehicle.model}`}
            loading="lazy"
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : (
          <span className="text-4xl font-black tracking-tight text-white/90">
            {vehicle.make[0]}
            {vehicle.model[0]}
          </span>
        )}
        {highlight && (
          <span className="absolute bottom-3 left-3 rounded-full bg-brand-600 px-2.5 py-0.5 text-xs font-semibold text-white shadow">
            {highlight}
          </span>
        )}
        {vehicle.photos.length > 1 && (
          <span className="absolute bottom-3 right-3 rounded-full bg-slate-900/70 px-2 py-0.5 text-xs font-medium text-white">
            {vehicle.photos.length} photos
          </span>
        )}
        {vehicle.is_vetted && (
          <div className="absolute left-3 top-3">
            <VettedBadge />
          </div>
        )}
        {vehicle.status === "sold" && (
          <div className="absolute right-3 top-3">
            <span className="rounded-full bg-slate-900/80 px-2.5 py-0.5 text-xs font-semibold text-white">
              Sold
            </span>
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold text-slate-900 group-hover:text-brand-700">
            {vehicle.year} {vehicle.make} {vehicle.model}
          </h3>
          <ConditionBadge condition={vehicle.condition} />
        </div>

        <p className="text-sm text-slate-500">
          {formatMileage(vehicle.mileage)} &middot; {vehicle.lga}, {vehicle.state}
        </p>

        {vehicle.features.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {vehicle.features.slice(0, 3).map((f) => (
              <span
                key={f}
                className="rounded-md bg-slate-100 px-2 py-0.5 text-xs text-slate-600"
              >
                {f.replaceAll("_", " ")}
              </span>
            ))}
            {vehicle.features.length > 3 && (
              <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs text-slate-500">
                +{vehicle.features.length - 3} more
              </span>
            )}
          </div>
        )}

        <div className="mt-auto flex items-center justify-between pt-2">
          <span className="text-lg font-bold text-slate-900">{formatPrice(vehicle.price)}</span>
          <span className="text-sm font-medium text-brand-600 group-hover:underline">
            View details &rarr;
          </span>
        </div>
      </div>
    </Link>
  );
}
