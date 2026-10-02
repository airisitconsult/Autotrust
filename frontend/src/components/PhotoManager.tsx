import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { assetUrl, extractErrorMessage } from "../api/client";
import { deleteVehiclePhoto, uploadVehiclePhoto } from "../api/vehicles";
import type { Vehicle } from "../types";

const MAX_BYTES = 5 * 1024 * 1024;
const MAX_PHOTOS = 10;
const ALLOWED = ["image/jpeg", "image/png", "image/webp"];

/** Owner-facing upload/remove grid. The server re-validates everything; the
 * checks here just give instant feedback before a doomed upload. */
export function PhotoManager({ vehicle }: { vehicle: Vehicle }) {
  const queryClient = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);

  function refresh() {
    queryClient.invalidateQueries({ queryKey: ["vehicle", vehicle.id] });
    queryClient.invalidateQueries({ queryKey: ["my-vehicles"] });
    queryClient.invalidateQueries({ queryKey: ["vehicles"] });
  }

  const removeMutation = useMutation({
    mutationFn: (photoId: string) => deleteVehiclePhoto(vehicle.id, photoId),
    onSuccess: refresh,
    onError: (err) => setErrors([extractErrorMessage(err)]),
  });

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    const problems: string[] = [];
    let room = MAX_PHOTOS - vehicle.photos.length;
    setUploading(true);
    for (const file of Array.from(files)) {
      if (!ALLOWED.includes(file.type)) {
        problems.push(`${file.name}: only JPEG, PNG or WebP images are allowed`);
      } else if (file.size > MAX_BYTES) {
        problems.push(`${file.name}: larger than 5 MB`);
      } else if (room <= 0) {
        problems.push(`${file.name}: limit of ${MAX_PHOTOS} photos reached`);
      } else {
        try {
          await uploadVehiclePhoto(vehicle.id, file);
          room -= 1;
        } catch (err) {
          problems.push(`${file.name}: ${extractErrorMessage(err)}`);
        }
      }
    }
    setErrors(problems);
    setUploading(false);
    if (inputRef.current) inputRef.current.value = "";
    refresh();
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-slate-700">
          Photos ({vehicle.photos.length}/{MAX_PHOTOS})
        </label>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading || vehicle.photos.length >= MAX_PHOTOS}
          className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        >
          {uploading ? "Uploading…" : "Add photos"}
        </button>
      </div>
      <input
        ref={inputRef}
        type="file"
        multiple
        accept={ALLOWED.join(",")}
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />

      {errors.length > 0 && (
        <ul className="mt-2 space-y-1 rounded-lg bg-red-50 p-3 text-sm text-red-700">
          {errors.map((e) => (
            <li key={e}>{e}</li>
          ))}
        </ul>
      )}

      {vehicle.photos.length === 0 ? (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="mt-3 flex h-32 w-full items-center justify-center rounded-xl border-2 border-dashed border-slate-300 text-sm text-slate-500 hover:border-brand-500 hover:text-brand-600"
        >
          No photos yet — listings with photos get far more attention. Tap to add (JPEG, PNG or WebP, up to 5 MB each)
        </button>
      ) : (
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {vehicle.photos.map((p, i) => (
            <div key={p.id} className="group relative aspect-[4/3] overflow-hidden rounded-lg bg-slate-100">
              <img src={assetUrl(p.thumb_url)} alt="" className="h-full w-full object-cover" />
              {i === 0 && (
                <span className="absolute left-1.5 top-1.5 rounded bg-slate-900/75 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                  Cover
                </span>
              )}
              <button
                type="button"
                aria-label="Remove photo"
                onClick={() => removeMutation.mutate(p.id)}
                disabled={removeMutation.isPending}
                className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-white/90 text-sm font-bold text-red-600 shadow hover:bg-white"
              >
                &times;
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
