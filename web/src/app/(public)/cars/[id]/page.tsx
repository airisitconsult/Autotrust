import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { OpenChatButton } from "@/components/chat/open-chat-button";
import { BuyPanel } from "@/components/cars/buy-panel";
import { MediaViewer } from "@/components/cars/media-viewer";
import { OwnerActions } from "@/components/cars/owner-actions";
import { ConditionBadge, VettedBadge } from "@/components/ui/badge";
import { assetUrl } from "@/lib/assets";
import { formatDate, formatMileage, formatPrice, titleCase } from "@/lib/format";
import { ApiNotFoundError, fetchVehicle, fetchVehicleInspections } from "@/lib/server-api";
import type { Vehicle } from "@/lib/types";

type Props = { params: Promise<{ id: string }> };

async function loadVehicle(id: string): Promise<Vehicle> {
  try {
    return await fetchVehicle(id);
  } catch (error) {
    if (error instanceof ApiNotFoundError) notFound();
    throw error;
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  try {
    const v = await fetchVehicle(id);
    const title = `${v.year} ${v.make} ${v.model}`;
    const cover = v.photos[0];
    return {
      title,
      description: `${title} · ${formatMileage(v.mileage)} · ${v.lga}, ${v.state} · ${formatPrice(v.price)}${
        v.is_vetted ? " · AutoTrust Vetted" : ""
      }`,
      openGraph: { title, images: cover ? [assetUrl(cover.url)] : undefined },
    };
  } catch {
    return { title: "Car not found" };
  }
}

function Spec({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white p-4 ring-1 ring-ink-200/70">
      <dt className="text-xs font-medium uppercase tracking-wide text-ink-400">{label}</dt>
      <dd className="mt-1 font-bold text-ink-900">{value}</dd>
    </div>
  );
}

export default async function CarPage({ params }: Props) {
  const { id } = await params;
  const vehicle = await loadVehicle(id);
  const inspections = await fetchVehicleInspections(id).catch(() => []);
  const name = `${vehicle.year} ${vehicle.make} ${vehicle.model}`;

  return (
    <div className="mx-auto max-w-7xl px-4 pb-28 pt-6 sm:px-6 sm:pb-12 sm:pt-8 lg:px-8">
      <nav aria-label="Breadcrumb" className="mb-5 flex items-center gap-2 text-sm text-ink-500">
        <Link href="/cars" className="font-medium hover:text-brand-700">
          Browse cars
        </Link>
        <span aria-hidden>›</span>
        <Link href={`/cars?make=${encodeURIComponent(vehicle.make)}`} className="hover:text-brand-700">
          {vehicle.make}
        </Link>
        <span aria-hidden>›</span>
        <span className="truncate text-ink-700">{vehicle.model}</span>
      </nav>

      <div className="grid gap-8 lg:grid-cols-[1.55fr_1fr] lg:gap-10">
        <div className="min-w-0">
          <MediaViewer vehicle={vehicle} />

          <div className="mt-7 flex flex-wrap items-center gap-2">
            {vehicle.is_vetted && <VettedBadge />}
            <ConditionBadge condition={vehicle.condition} />
            {vehicle.status === "sold" && (
              <span className="rounded-full bg-ink-900 px-2.5 py-0.5 text-xs font-semibold text-white">Sold</span>
            )}
          </div>
          <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-ink-950 sm:text-4xl">{name}</h1>
          <p className="mt-2 text-ink-500">
            {vehicle.lga}, {vehicle.state} · {formatMileage(vehicle.mileage)}
          </p>

          <dl className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
            <Spec label="Year" value={String(vehicle.year)} />
            <Spec label="Mileage" value={formatMileage(vehicle.mileage)} />
            <Spec label="Condition" value={titleCase(vehicle.condition)} />
            <Spec label="Location" value={`${vehicle.lga}, ${vehicle.state}`} />
            <Spec label="Listed" value={formatDate(vehicle.created_at)} />
            <Spec label="VIN" value={vehicle.vin} />
          </dl>

          <section className="mt-9">
            <h2 className="text-xl font-bold text-ink-950">About this car</h2>
            <p className="mt-3 whitespace-pre-line leading-relaxed text-ink-700">{vehicle.description}</p>
          </section>

          {vehicle.features.length > 0 && (
            <section className="mt-9">
              <h2 className="text-xl font-bold text-ink-950">Features</h2>
              <ul className="mt-4 grid grid-cols-1 gap-x-6 gap-y-2.5 min-[420px]:grid-cols-2 sm:grid-cols-3">
                {vehicle.features.map((f) => (
                  <li key={f} className="flex items-center gap-2.5 text-sm text-ink-700">
                    <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-trust-100 text-trust-600">
                      <svg className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
                        <path
                          fillRule="evenodd"
                          d="M16.7 4.15a.75.75 0 01.14 1.05l-8 10.5a.75.75 0 01-1.13.08l-4.5-4.5a.75.75 0 111.06-1.06l3.9 3.89 7.47-9.82a.75.75 0 011.06-.14z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </span>
                    {titleCase(f)}
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section className="mt-9">
            <h2 className="text-xl font-bold text-ink-950">Inspection reports</h2>
            {inspections.length === 0 ? (
              <p className="mt-3 rounded-2xl border border-dashed border-ink-300 bg-white p-6 text-sm text-ink-500">
                This car hasn&apos;t been inspected by AutoTrust yet.
              </p>
            ) : (
              <div className="mt-4 space-y-3">
                {inspections.map((insp) => (
                  <article
                    key={insp.id}
                    className={`rounded-2xl p-5 ring-1 ${
                      insp.passed ? "bg-trust-50 ring-trust-200" : "bg-red-50 ring-red-200"
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className={`font-bold ${insp.passed ? "text-trust-800" : "text-red-800"}`}>
                        {insp.passed ? "✓ Passed inspection" : "✗ Did not pass inspection"}
                      </p>
                      {insp.completed_at && (
                        <time className="text-xs text-ink-500" dateTime={insp.completed_at}>
                          {formatDate(insp.completed_at)}
                        </time>
                      )}
                    </div>
                    {(insp.ai_report || insp.notes) && (
                      <p className="mt-2.5 text-sm leading-relaxed text-ink-700">{insp.ai_report ?? insp.notes}</p>
                    )}
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>

        <aside id="buy" className="scroll-mt-24 lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-3xl border border-ink-200/80 bg-white p-6 shadow-card">
            <p className="text-sm font-medium text-ink-500">Asking price</p>
            <p className="mt-1 text-4xl font-extrabold tracking-tight text-ink-950">{formatPrice(vehicle.price)}</p>

            <div
              className={`mt-5 flex items-start gap-3 rounded-2xl p-4 text-sm ${
                vehicle.is_vetted ? "bg-trust-50 text-trust-800" : "bg-ink-50 text-ink-600"
              }`}
            >
              <span aria-hidden className="text-lg leading-none">
                {vehicle.is_vetted ? "✓" : "ℹ"}
              </span>
              <p>
                {vehicle.is_vetted
                  ? "This car passed an in-person AutoTrust inspection. Read the report below before you decide."
                  : "This car hasn't been inspected by AutoTrust. Inspect it yourself before paying."}
              </p>
            </div>

            <div className="mt-5 space-y-3">
              <OwnerActions vehicle={vehicle} />
              <BuyPanel vehicle={vehicle} />
              <OpenChatButton variant="ghost" size="sm" className="w-full">
                Ask the AI assistant about this car
              </OpenChatButton>
            </div>
          </div>

          <div className="mt-4 rounded-2xl bg-white p-5 text-sm text-ink-600 ring-1 ring-ink-200/70">
            <p className="font-bold text-ink-900">Buying safely</p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>See the car in person before paying.</li>
              <li>Check the VIN matches the papers.</li>
              <li>Prefer Vetted cars with a passed report.</li>
            </ul>
          </div>
        </aside>
      </div>

      {/* Phones: a price bar that stays in reach */}
      <div className="fixed inset-x-0 bottom-0 z-30 flex items-center justify-between gap-3 border-t border-ink-200 bg-white/95 px-4 py-3 backdrop-blur lg:hidden">
        <div>
          <p className="text-xs text-ink-500">Asking price</p>
          <p className="text-xl font-extrabold text-ink-950">{formatPrice(vehicle.price)}</p>
        </div>
        <a
          href="#buy"
          className="inline-flex h-11 items-center rounded-xl bg-brand-600 px-5 text-sm font-semibold text-white"
        >
          Buy or enquire
        </a>
      </div>
    </div>
  );
}
