"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Panel, PanelTitle } from "@/components/dashboard/cards";
import { FeatureChecklist } from "@/components/forms/feature-checklist";
import { StateLgaSelect } from "@/components/forms/state-lga-select";
import { Button } from "@/components/ui/button";
import { ErrorNote, Field, Input, Select, SuccessNote, Textarea } from "@/components/ui/fields";
import { createVehicle, extractErrorMessage, updateVehicle } from "@/lib/api";
import { titleCase } from "@/lib/format";
import {
  BODY_TYPES,
  BODY_TYPE_LABELS,
  type BodyType,
  type Vehicle,
  type VehicleCondition,
  type VehicleInput,
} from "@/lib/types";

const EMPTY: VehicleInput = {
  vin: "",
  make: "",
  model: "",
  year: new Date().getFullYear() - 3,
  mileage: 0,
  price: 0,
  condition: "good",
  body_type: "sedan",
  state: "",
  lga: "",
  description: "",
  features: [],
};

// What an inspector actually checks: changing these voids a passed inspection.
const INSPECTED: (keyof VehicleInput)[] = ["make", "model", "year", "mileage", "condition", "body_type"];

function fromVehicle(v: Vehicle): VehicleInput {
  return {
    vin: v.vin,
    make: v.make,
    model: v.model,
    year: v.year,
    mileage: v.mileage,
    price: v.price,
    condition: v.condition,
    body_type: v.body_type ?? "sedan",
    state: v.state,
    lga: v.lga,
    description: v.description,
    features: v.features,
  };
}

/** Create or edit a listing. After creating, the owner goes straight to the
 * edit page, where photos, the 360° set and the inspection request live. */
export function ListingForm({ vehicle }: { vehicle?: Vehicle }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const isEdit = !!vehicle;
  const original = vehicle ? fromVehicle(vehicle) : EMPTY;
  const [form, setForm] = useState<VehicleInput>(original);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const set = <K extends keyof VehicleInput>(key: K, value: VehicleInput[K]) => {
    setSaved(false);
    setForm((f) => ({ ...f, [key]: value }));
  };

  const mutation = useMutation({
    mutationFn: () => {
      if (!vehicle) return createVehicle(form);
      const { vin: _vin, ...changes } = form; // the VIN can't be changed
      void _vin;
      return updateVehicle(vehicle.id, changes);
    },
    onSuccess: (saved) => {
      queryClient.invalidateQueries({ queryKey: ["my-vehicles"] });
      queryClient.invalidateQueries({ queryKey: ["vehicle", saved.id] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
      if (isEdit) setSaved(true);
      else router.push(`/dashboard/listings/${saved.id}/edit?created=1`);
    },
    onError: (err) => setError(extractErrorMessage(err)),
  });

  const voidsInspection =
    isEdit && vehicle?.is_vetted && INSPECTED.some((k) => form[k] !== original[k]);

  function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    mutation.mutate();
  }

  const num = (key: "year" | "mileage" | "price") => ({
    type: "number" as const,
    required: true,
    min: key === "year" ? 1980 : 0,
    value: form[key],
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => set(key, Number(e.target.value)),
  });

  return (
    <form onSubmit={submit} className="space-y-5">
      {error && <ErrorNote>{error}</ErrorNote>}
      {saved && <SuccessNote>Saved.</SuccessNote>}
      {voidsInspection && (
        <p className="rounded-xl bg-gold-500/15 p-3.5 text-sm text-gold-400">
          <strong>Heads up:</strong> changing the make, model, year, mileage, condition or car type cancels this
          car&apos;s inspection. It will come off sale until it&apos;s inspected again.
        </p>
      )}

      <Panel>
        <PanelTitle>The car</PanelTitle>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Make" htmlFor="make">
            <Input id="make" required placeholder="Toyota" value={form.make} onChange={(e) => set("make", e.target.value)} />
          </Field>
          <Field label="Model" htmlFor="model">
            <Input id="model" required placeholder="Camry" value={form.model} onChange={(e) => set("model", e.target.value)} />
          </Field>
          <Field label="Car type" htmlFor="body">
            <Select id="body" value={form.body_type} onChange={(e) => set("body_type", e.target.value as BodyType)}>
              {BODY_TYPES.map((b) => (
                <option key={b} value={b}>
                  {BODY_TYPE_LABELS[b]}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Year" htmlFor="year">
            <Input id="year" {...num("year")} />
          </Field>
          <Field label="Mileage (km)" htmlFor="mileage">
            <Input id="mileage" {...num("mileage")} />
          </Field>
          <Field label="Condition" htmlFor="condition">
            <Select
              id="condition"
              value={form.condition}
              onChange={(e) => set("condition", e.target.value as VehicleCondition)}
            >
              {(["excellent", "good", "fair", "poor"] as const).map((c) => (
                <option key={c} value={c}>
                  {titleCase(c)}
                </option>
              ))}
            </Select>
          </Field>
          <Field
            label="VIN"
            htmlFor="vin"
            hint={isEdit ? "The VIN can't be changed after listing." : "The 17-character vehicle identification number."}
          >
            <Input
              id="vin"
              required
              minLength={5}
              maxLength={32}
              disabled={isEdit}
              value={form.vin}
              onChange={(e) => set("vin", e.target.value.toUpperCase())}
            />
          </Field>
          <Field label="Asking price (USD)" htmlFor="price">
            <Input id="price" {...num("price")} min={1} />
          </Field>
        </div>
      </Panel>

      <Panel>
        <PanelTitle>Where is it?</PanelTitle>
        <StateLgaSelect
          state={form.state}
          lga={form.lga}
          onChange={({ state, lga }) => {
            set("state", state);
            set("lga", lga);
          }}
        />
      </Panel>

      <Panel>
        <PanelTitle>About this car</PanelTitle>
        <Field label="Description" htmlFor="description" hint="Service history, number of owners, anything a buyer should know.">
          <Textarea
            id="description"
            required
            rows={5}
            value={form.description}
            onChange={(e) => set("description", e.target.value)}
          />
        </Field>
        <p className="mb-2 mt-5 text-sm font-medium text-night-text">Features</p>
        <FeatureChecklist selected={form.features} onChange={(f) => set("features", f)} />
      </Panel>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" size="lg" disabled={mutation.isPending}>
          {mutation.isPending ? "Saving…" : isEdit ? "Save changes" : "Create listing"}
        </Button>
        {!isEdit && (
          <p className="text-sm text-night-muted">Next you&apos;ll add photos and request an inspection.</p>
        )}
      </div>
    </form>
  );
}
