"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { SpinViewer } from "@/components/cars/spin-viewer";
import { Panel, PanelTitle } from "@/components/dashboard/cards";
import { Button } from "@/components/ui/button";
import { ErrorNote } from "@/components/ui/fields";
import { Icon } from "@/components/ui/icon";
import { assetUrl } from "@/lib/assets";
import { deleteSpinSet, deleteVehiclePhoto, extractErrorMessage, uploadVehiclePhoto } from "@/lib/api";
import { MIN_SPIN_FRAMES, type Vehicle } from "@/lib/types";

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED = ["image/jpeg", "image/png", "image/webp"];

/** Check a file the way the server will, so mistakes show up instantly. */
function problemWith(file: File): string | null {
  if (!ALLOWED.includes(file.type)) return `${file.name}: only JPEG, PNG or WebP images are allowed`;
  if (file.size > MAX_BYTES) return `${file.name}: larger than 5 MB`;
  return null;
}

/** Gallery pictures: add several at once, remove any. The first is the cover. */
export function PhotoManager({ vehicle }: { vehicle: Vehicle }) {
  const queryClient = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [problems, setProblems] = useState<string[]>([]);
  const [uploading, setUploading] = useState<string | null>(null);
  const max = 10;

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["vehicle", vehicle.id] });

  const remove = useMutation({
    mutationFn: (photoId: string) => deleteVehiclePhoto(vehicle.id, photoId),
    onSuccess: refresh,
    onError: (err) => setProblems([extractErrorMessage(err)]),
  });

  async function handleFiles(files: FileList | null) {
    if (!files?.length) return;
    const issues: string[] = [];
    let room = max - vehicle.photos.length;
    const list = Array.from(files);
    for (let i = 0; i < list.length; i++) {
      const file = list[i];
      const bad = problemWith(file);
      if (bad) issues.push(bad);
      else if (room <= 0) issues.push(`${file.name}: the limit of ${max} photos is reached`);
      else {
        setUploading(`Uploading ${i + 1} of ${list.length}…`);
        try {
          await uploadVehiclePhoto(vehicle.id, file, "photo");
          room -= 1;
        } catch (err) {
          issues.push(`${file.name}: ${extractErrorMessage(err)}`);
        }
      }
    }
    setProblems(issues);
    setUploading(null);
    if (inputRef.current) inputRef.current.value = "";
    refresh();
  }

  return (
    <Panel>
      <PanelTitle
        action={
          <Button size="sm" onClick={() => inputRef.current?.click()} disabled={!!uploading || vehicle.photos.length >= max}>
            {uploading ?? "Add photos"}
          </Button>
        }
      >
        Photos ({vehicle.photos.length}/{max})
      </PanelTitle>
      <input
        ref={inputRef}
        type="file"
        multiple
        accept={ALLOWED.join(",")}
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
      {problems.length > 0 && (
        <ul className="mb-3 space-y-1 rounded-xl bg-red-500/10 p-3 text-sm text-red-300">
          {problems.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ul>
      )}
      {vehicle.photos.length === 0 ? (
        <button
          onClick={() => inputRef.current?.click()}
          className="flex h-32 w-full flex-col items-center justify-center gap-1 rounded-2xl border-2 border-dashed border-night-line text-sm text-night-muted transition hover:border-accent hover:text-accent"
        >
          <Icon name="plus" />
          Add clear photos from different angles (JPEG, PNG or WebP, up to 5 MB each)
        </button>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {vehicle.photos.map((p, i) => (
            <div key={p.id} className="group relative aspect-[4/3] overflow-hidden rounded-xl bg-night-900">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={assetUrl(p.thumb_url)} alt="" className="h-full w-full object-cover" />
              {i === 0 && (
                <span className="absolute left-2 top-2 rounded-md bg-night-950/80 px-1.5 py-0.5 text-[10px] font-bold text-white">
                  Cover
                </span>
              )}
              <button
                aria-label="Remove photo"
                onClick={() => remove.mutate(p.id)}
                disabled={remove.isPending}
                className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-night-950/80 text-white transition hover:bg-red-600"
              >
                <Icon name="close" className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </Panel>
  );
}

/** The 360° walk-around: upload a set of photos taken in a circle, in order. */
export function SpinManager({ vehicle }: { vehicle: Vehicle }) {
  const queryClient = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [problems, setProblems] = useState<string[]>([]);
  const [progress, setProgress] = useState<string | null>(null);
  const max = 36;
  const frames = vehicle.spin.length;

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["vehicle", vehicle.id] });

  const clear = useMutation({
    mutationFn: () => deleteSpinSet(vehicle.id),
    onSuccess: refresh,
    onError: (err) => setProblems([extractErrorMessage(err)]),
  });

  async function handleFiles(files: FileList | null) {
    if (!files?.length) return;
    // Frames are shown in the order they were uploaded, so upload them in
    // file-name order (IMG_2 before IMG_10) one at a time.
    const list = Array.from(files).sort((a, b) =>
      a.name.localeCompare(b.name, undefined, { numeric: true }),
    );
    const issues: string[] = [];
    let room = max - frames;
    let done = 0;
    for (const file of list) {
      const bad = problemWith(file);
      if (bad) issues.push(bad);
      else if (room <= 0) issues.push(`${file.name}: the limit of ${max} frames is reached`);
      else {
        setProgress(`Uploading frame ${done + 1} of ${list.length}…`);
        try {
          await uploadVehiclePhoto(vehicle.id, file, "spin");
          room -= 1;
          done += 1;
        } catch (err) {
          issues.push(`${file.name}: ${extractErrorMessage(err)}`);
        }
      }
    }
    setProblems(issues);
    setProgress(null);
    if (inputRef.current) inputRef.current.value = "";
    refresh();
  }

  return (
    <Panel>
      <PanelTitle
        action={
          <div className="flex gap-2">
            {frames > 0 && (
              <Button
                size="sm"
                variant="secondary"
                onClick={() => {
                  if (confirm("Remove the whole 360° set so you can shoot it again?")) clear.mutate();
                }}
                disabled={clear.isPending || !!progress}
              >
                Start over
              </Button>
            )}
            <Button size="sm" onClick={() => inputRef.current?.click()} disabled={!!progress || frames >= max}>
              {progress ?? (frames > 0 ? "Add frames" : "Upload frames")}
            </Button>
          </div>
        }
      >
        360° view ({frames}/{max} frames)
      </PanelTitle>
      <input
        ref={inputRef}
        type="file"
        multiple
        accept={ALLOWED.join(",")}
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
      {problems.length > 0 && (
        <div className="mb-3">
          <ErrorNote>{problems.join(" · ")}</ErrorNote>
        </div>
      )}

      {frames === 0 && (
        <div className="rounded-2xl bg-night-900 p-4 text-sm text-night-muted">
          <p className="font-semibold text-night-text">Let buyers turn your car around</p>
          <ol className="mt-2 list-decimal space-y-1 pl-5">
            <li>Park the car in an open space.</li>
            <li>Walk a full circle around it, taking a photo every few steps (16 to 24 photos works well).</li>
            <li>Keep the same distance and height, and keep the car in the middle.</li>
            <li>Select all the photos together. Keep the camera&apos;s file names so they stay in order.</li>
          </ol>
        </div>
      )}
      {frames > 0 && frames < MIN_SPIN_FRAMES && (
        <p className="mb-3 rounded-xl bg-gold-500/15 p-3 text-sm text-gold-400">
          Add at least {MIN_SPIN_FRAMES} frames ({MIN_SPIN_FRAMES - frames} more) before buyers can see the 360° view.
        </p>
      )}
      {frames >= MIN_SPIN_FRAMES && (
        <div className="overflow-hidden rounded-2xl ring-1 ring-night-line">
          <SpinViewer frames={vehicle.spin} alt={`${vehicle.make} ${vehicle.model}`} />
        </div>
      )}
    </Panel>
  );
}
