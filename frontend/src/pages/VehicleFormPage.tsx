import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { extractErrorMessage } from "../api/client";
import { createVehicle, getVehicle, updateVehicle } from "../api/vehicles";
import { FeatureChecklist } from "../components/FeatureChecklist";
import { PhotoManager } from "../components/PhotoManager";
import { FullPageSpinner } from "../components/Spinner";
import { StateLgaSelect } from "../components/StateLgaSelect";
import type { VehicleCondition, VehicleFeature, VehicleInput } from "../types";

const EMPTY_FORM: VehicleInput = {
  vin: "",
  make: "",
  model: "",
  year: new Date().getFullYear(),
  mileage: 0,
  price: 0,
  condition: "good",
  state: "",
  lga: "",
  description: "",
  features: [],
};

export function VehicleFormPage() {
  const { id } = useParams<{ id?: string }>();
  const isEdit = !!id;
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [form, setForm] = useState<VehicleInput>(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);
  const populatedFor = useRef<string | null>(null);
  const justCreated = (useLocation().state as { created?: boolean } | null)?.created === true;

  const vehicleQuery = useQuery({
    queryKey: ["vehicle", id],
    queryFn: () => getVehicle(id!),
    enabled: isEdit,
  });

  useEffect(() => {
    // Populate once per vehicle. Uploading/removing a photo refetches the
    // vehicle, and re-running this would wipe the user's unsaved edits.
    if (vehicleQuery.data && populatedFor.current !== vehicleQuery.data.id) {
      const v = vehicleQuery.data;
      populatedFor.current = v.id;
      setForm({
        vin: v.vin,
        make: v.make,
        model: v.model,
        year: v.year,
        mileage: v.mileage,
        price: v.price,
        condition: v.condition,
        state: v.state,
        lga: v.lga,
        description: v.description,
        features: v.features,
      });
    }
  }, [vehicleQuery.data]);

  const mutation = useMutation({
    mutationFn: () => (isEdit ? updateVehicle(id!, form) : createVehicle(form)),
    onSuccess: (vehicle) => {
      queryClient.invalidateQueries({ queryKey: ["my-vehicles"] });
      queryClient.invalidateQueries({ queryKey: ["vehicles"] });
      // A new listing goes straight to the edit page so photos can be added
      // (they need an existing vehicle id to attach to).
      if (isEdit) navigate(`/vehicles/${vehicle.id}`);
      else navigate(`/edit-listing/${vehicle.id}`, { state: { created: true } });
    },
    onError: (err) => setError(extractErrorMessage(err)),
  });

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    mutation.mutate();
  }

  function field<K extends keyof VehicleInput>(key: K, value: VehicleInput[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  if (isEdit && vehicleQuery.isLoading) return <FullPageSpinner />;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-bold text-slate-900">
        {isEdit ? "Edit listing" : "List a vehicle"}
      </h1>
      <p className="mt-1 text-slate-500">
        {isEdit
          ? "Update your vehicle's details."
          : "Give buyers the details they need to trust your listing."}
      </p>

      {justCreated && (
        <p className="mt-4 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">
          Listing created. Add photos below, then{" "}
          <Link to={`/vehicles/${id}`} className="font-semibold underline">
            view your listing
          </Link>
          .
        </p>
      )}

      {isEdit && vehicleQuery.data && (
        <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-4">
          <PhotoManager vehicle={vehicleQuery.data} />
        </div>
      )}
      {!isEdit && (
        <p className="mt-4 text-sm text-slate-500">
          You&apos;ll be able to add photos right after creating the listing.
        </p>
      )}

      <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-5">
        {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <TextField label="VIN" value={form.vin} onChange={(v) => field("vin", v)} disabled={isEdit} />
          <TextField label="Make" value={form.make} onChange={(v) => field("make", v)} />
          <TextField label="Model" value={form.model} onChange={(v) => field("model", v)} />
          <NumberField label="Year" value={form.year} onChange={(v) => field("year", v)} />
          <NumberField label="Mileage (km)" value={form.mileage} onChange={(v) => field("mileage", v)} />
          <NumberField label="Price (USD)" value={form.price} onChange={(v) => field("price", v)} />
          <div>
            <label className="text-sm font-medium text-slate-700">Condition</label>
            <select
              value={form.condition}
              onChange={(e) => field("condition", e.target.value as VehicleCondition)}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
            >
              <option value="excellent">Excellent</option>
              <option value="good">Good</option>
              <option value="fair">Fair</option>
              <option value="poor">Poor</option>
            </select>
          </div>
        </div>

        <StateLgaSelect
          state={form.state}
          lga={form.lga}
          onStateChange={(v) => field("state", v)}
          onLgaChange={(v) => field("lga", v)}
        />

        <div>
          <label className="text-sm font-medium text-slate-700">Description</label>
          <textarea
            required
            rows={4}
            value={form.description}
            onChange={(e) => field("description", e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
          />
        </div>

        <div>
          <label className="text-sm font-medium text-slate-700">Features</label>
          <div className="mt-2">
            <FeatureChecklist
              selected={form.features}
              onChange={(f: VehicleFeature[]) => field("features", f)}
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={mutation.isPending}
          className="mt-2 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
        >
          {mutation.isPending ? "Saving…" : isEdit ? "Save changes" : "Create listing"}
        </button>
      </form>
    </div>
  );
}

function TextField({
  label,
  value,
  onChange,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  return (
    <div>
      <label className="text-sm font-medium text-slate-700">{label}</label>
      <input
        type="text"
        required
        disabled={disabled}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100 disabled:bg-slate-50 disabled:text-slate-400"
      />
    </div>
  );
}

function NumberField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <label className="text-sm font-medium text-slate-700">{label}</label>
      <input
        type="number"
        required
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
      />
    </div>
  );
}
