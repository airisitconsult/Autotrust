import { useState } from "react";
import { assetUrl } from "../api/client";
import type { Vehicle } from "../types";

export function PhotoGallery({ vehicle }: { vehicle: Vehicle }) {
  const [selected, setSelected] = useState(0);
  const photos = vehicle.photos;
  const current = photos[Math.min(selected, photos.length - 1)];
  const alt = `${vehicle.year} ${vehicle.make} ${vehicle.model}`;

  if (!current) {
    return (
      <div className="flex h-56 items-center justify-center rounded-2xl bg-gradient-to-br from-slate-700 to-slate-900 sm:h-72">
        <span className="text-6xl font-black tracking-tight text-white/90">
          {vehicle.make[0]}
          {vehicle.model[0]}
        </span>
      </div>
    );
  }

  return (
    <div>
      <div className="aspect-[4/3] overflow-hidden rounded-2xl bg-slate-100 sm:aspect-[16/10]">
        <img src={assetUrl(current.url)} alt={alt} className="h-full w-full object-cover" />
      </div>
      {photos.length > 1 && (
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
          {photos.map((p, i) => (
            <button
              key={p.id}
              onClick={() => setSelected(i)}
              aria-label={`Show photo ${i + 1}`}
              className={`h-16 w-24 flex-shrink-0 overflow-hidden rounded-lg border-2 ${
                p.id === current.id ? "border-brand-600" : "border-transparent opacity-70 hover:opacity-100"
              }`}
            >
              <img src={assetUrl(p.thumb_url)} alt="" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
