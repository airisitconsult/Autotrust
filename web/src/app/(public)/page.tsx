import Link from "next/link";
import { HeroCar } from "@/components/brand/hero-car";
import { FindCarBar } from "@/components/cars/find-car-bar";
import { VehicleCard } from "@/components/cars/vehicle-card";
import { OpenChatButton } from "@/components/chat/open-chat-button";
import { ButtonLink } from "@/components/ui/button";
import { fetchMakes, fetchVehicles } from "@/lib/server-api";
import { BODY_TYPES, BODY_TYPE_LABELS } from "@/lib/types";

// Show a section's data when the API answers, and an empty section (not an
// error page) when it doesn't — the landing page should always load.
async function safe<T>(promise: Promise<T>, fallback: T): Promise<T> {
  try {
    return await promise;
  } catch {
    return fallback;
  }
}

const trust = [
  {
    title: "Inspected in person",
    body: "A real inspector checks every Vetted car.",
    icon: "M9 12l2 2 4-4m5.6-4A12 12 0 0112 3a12 12 0 01-8.6 3A12 12 0 003 12c0 5.6 3.8 10.3 9 11.6 5.2-1.3 9-6 9-11.6 0-2-.4-3.9-1.4-5.5z",
  },
  {
    title: "Reports in plain English",
    body: "AI turns inspector notes into a clear summary.",
    icon: "M8 7h8M8 11h8M8 15h5M5 3h14a1 1 0 011 1v16a1 1 0 01-1 1H5a1 1 0 01-1-1V4a1 1 0 011-1z",
  },
  {
    title: "Pay safely",
    body: "We hold your money until you have the car.",
    icon: "M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z",
  },
  {
    title: "See every angle",
    body: "Spin cars around in 360° before you visit.",
    icon: "M4 4v5h5M20 20v-5h-5M5.6 15A8 8 0 0018.4 9M18.4 9A8 8 0 005.6 15",
  },
];

const buyingSteps = [
  ["Search or ask the AI", "Filter by location, type, brand and budget, or just describe what you need."],
  ["Enquire with the seller", "Message them through AutoTrust. Your email stays private."],
  ["Pay AutoTrust by transfer", "The car is reserved for you. We confirm your payment."],
  ["Collect and confirm", "Once you have the car, confirm it and the seller is paid."],
];

const sellingSteps = [
  ["Sign up and verify", "Create a seller account and confirm your email."],
  ["List and request inspection", "Add photos and details, then book an AutoTrust inspection."],
  ["Go live when it passes", "Passed cars are published with the Vetted badge and report."],
  ["Get paid 95%", "AutoTrust keeps 5% for inspection, safe payment and support."],
];

export default async function HomePage() {
  const [makes, vetted] = await Promise.all([
    safe(fetchMakes(), []),
    safe(fetchVehicles({ is_vetted: true, limit: 8 }), []),
  ]);
  // Fall back to the newest listings while there aren't enough vetted ones.
  const featured = vetted.length >= 4 ? vetted : await safe(fetchVehicles({ limit: 8 }), vetted);

  return (
    <>
      {/* Hero */}
      {/* The hero background is sampled from the photo itself (slate #2a303d to warm grey #767c81) so the picture melts into it. */}
      <section
        className="relative isolate overflow-hidden pb-28 text-white sm:pb-32"
        style={{
          backgroundColor: "#262b37",
          backgroundImage:
            "radial-gradient(60% 80% at 82% 62%, rgba(124,110,110,0.55) 0%, rgba(118,124,129,0.28) 38%, transparent 72%), linear-gradient(120deg, #1d212b 0%, #262b37 45%, #3a3d47 100%)",
        }}
      >
        <div className="absolute -left-40 -top-40 -z-10 h-[30rem] w-[30rem] rounded-full bg-white/[0.06] blur-3xl" aria-hidden />
        <div
          className="absolute inset-0 -z-10 opacity-[0.06]"
          style={{
            backgroundImage:
              "linear-gradient(white 1px, transparent 1px), linear-gradient(90deg, white 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
          aria-hidden
        />
        <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 pb-6 pt-12 sm:px-6 sm:pt-16 lg:grid-cols-[1.1fr_1fr] lg:gap-8 lg:px-8 lg:pt-20">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3.5 py-1.5 text-xs font-bold uppercase tracking-widest text-brand-100 ring-1 ring-white/15">
              <span className="h-1.5 w-1.5 rounded-full bg-trust-400" aria-hidden />
              Verified · Secure · Reliable
            </p>
            <h1 className="mt-6 text-[2.6rem] font-black uppercase leading-[1.02] tracking-tight sm:text-6xl lg:text-[3.1rem] xl:text-[3.9rem]">
              Buy the best.
              <span className="mt-1 block bg-gradient-to-r from-brand-300 via-brand-200 to-trust-300 bg-clip-text text-transparent">
                Trust the report.
              </span>
            </h1>
            <p className="mt-6 max-w-xl text-base leading-relaxed text-brand-100/90 sm:text-lg">
              Quality used cars, inspected in person and explained in plain language. Affordable prices, no
              guesswork, and your money protected until the car is yours.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <ButtonLink href="/cars" size="lg" className="!bg-white !text-brand-800 hover:!bg-brand-50">
                Browse cars →
              </ButtonLink>
              <ButtonLink
                href="/#how-it-works"
                size="lg"
                variant="secondary"
                className="!border-white/25 !bg-white/10 !text-white hover:!bg-white/20"
              >
                How it works
              </ButtonLink>
            </div>
            <div className="mt-8 flex flex-wrap gap-x-7 gap-y-2 text-sm text-brand-100/80">
              {["Physically inspected", "AI-written reports", "Search by state and LGA"].map((t) => (
                <span key={t} className="flex items-center gap-2">
                  <span className="text-trust-400">✓</span> {t}
                </span>
              ))}
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-xl pt-6 lg:ml-auto lg:mr-0 lg:max-w-[34rem]">
            <HeroCar />
            <div className="absolute -top-1 right-3 flex items-center gap-2 rounded-2xl bg-white px-3 py-2 text-ink-900 shadow-lift sm:right-5 sm:px-3.5 sm:py-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-trust-500 text-sm font-bold text-white">
                ✓
              </span>
              <span>
                <span className="block text-sm font-extrabold leading-tight">AutoTrust Vetted</span>
                <span className="block text-xs text-ink-500">Inspection passed</span>
              </span>
            </div>
            <div className="absolute -bottom-6 -left-2 hidden rounded-2xl bg-white/95 px-4 py-3 text-ink-900 shadow-lift sm:block lg:-left-8">
              <p className="text-[11px] font-bold uppercase tracking-wide text-ink-400">Sample report</p>
              <p className="mt-0.5 max-w-[12rem] text-xs leading-snug text-ink-600">
                Engine and gearbox run smoothly. No signs of accident damage.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Trust bar, overlapping the hero */}
      <section className="relative z-10 mx-auto -mt-16 max-w-7xl px-4 sm:-mt-20 sm:px-6 lg:px-8">
        <div className="grid gap-px overflow-hidden rounded-3xl bg-ink-200/70 shadow-lift ring-1 ring-ink-200/70 sm:grid-cols-2 lg:grid-cols-4">
          {trust.map((t) => (
            <div key={t.title} className="flex items-start gap-3.5 bg-white p-5">
              <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d={t.icon} />
                </svg>
              </span>
              <span>
                <span className="block font-bold text-ink-950">{t.title}</span>
                <span className="mt-0.5 block text-sm leading-snug text-ink-500">{t.body}</span>
              </span>
            </div>
          ))}
        </div>

        <div className="mt-5">
          <FindCarBar makes={makes} />
        </div>
      </section>

      {/* Featured */}
      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-extrabold tracking-tight text-ink-950 sm:text-4xl">
              {vetted.length >= 4 ? "Vetted and ready to drive" : "Latest cars"}
            </h2>
            <p className="mt-2 text-ink-500">
              {vetted.length >= 4
                ? "Every one of these has passed an in-person inspection."
                : "Freshly listed on AutoTrust."}
            </p>
          </div>
          <ButtonLink href="/cars" variant="secondary" size="sm" className="hidden sm:inline-flex">
            View all cars
          </ButtonLink>
        </div>

        {featured.length === 0 ? (
          <div className="mt-8 rounded-3xl border border-dashed border-ink-300 bg-white p-12 text-center text-ink-500">
            No cars listed yet. Be the first —{" "}
            <Link href="/register?as=seller" className="font-semibold text-brand-600 hover:underline">
              sell your car
            </Link>
            .
          </div>
        ) : (
          <div className="mt-8 grid grid-cols-1 gap-5 min-[560px]:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {featured.slice(0, 8).map((v) => (
              <VehicleCard key={v.id} vehicle={v} />
            ))}
          </div>
        )}
        <ButtonLink href="/cars" variant="secondary" className="mt-8 w-full sm:hidden">
          View all cars
        </ButtonLink>
      </section>

      {/* Shop by type */}
      <section className="bg-white">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <h2 className="text-xl font-extrabold tracking-tight text-ink-950 sm:text-2xl">Shop by car type</h2>
          <div className="no-scrollbar -mx-4 mt-5 flex gap-3 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
            {BODY_TYPES.map((b) => (
              <Link
                key={b}
                href={`/cars?body_type=${b}`}
                className="flex-shrink-0 rounded-2xl border border-ink-200 bg-ink-50 px-5 py-3 text-sm font-bold text-ink-800 transition hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700"
              >
                {BODY_TYPE_LABELS[b]}
              </Link>
            ))}
          </div>
          {makes.length > 0 && (
            <div className="no-scrollbar -mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
              {makes.map((m) => (
                <Link
                  key={m}
                  href={`/cars?make=${encodeURIComponent(m)}`}
                  className="flex-shrink-0 rounded-full border border-ink-200 bg-white px-4 py-2 text-sm font-semibold text-ink-600 transition hover:border-brand-300 hover:text-brand-700"
                >
                  {m}
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="scroll-mt-20">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-2xl font-extrabold tracking-tight text-ink-950 sm:text-4xl">
              How AutoTrust works
            </h2>
            <p className="mt-3 text-ink-500">
              Every sale goes through us, so buyers and sellers are protected.
            </p>
          </div>
          <div className="mt-12 grid gap-6 lg:grid-cols-2">
            {[
              { title: "Buying a car", tag: "For buyers", steps: buyingSteps, cta: ["Browse cars", "/cars"] },
              { title: "Selling a car", tag: "For sellers", steps: sellingSteps, cta: ["Start selling", "/register?as=seller"] },
            ].map((col) => (
              <div key={col.title} className="rounded-3xl bg-white p-6 shadow-card ring-1 ring-ink-200/70 sm:p-8">
                <p className="text-xs font-bold uppercase tracking-widest text-brand-600">{col.tag}</p>
                <h3 className="mt-1 text-2xl font-extrabold text-ink-950">{col.title}</h3>
                <ol className="mt-6 space-y-5">
                  {col.steps.map(([title, body], i) => (
                    <li key={title} className="flex gap-4">
                      <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-brand-600 text-sm font-extrabold text-white">
                        {i + 1}
                      </span>
                      <span>
                        <span className="block font-bold text-ink-950">{title}</span>
                        <span className="mt-0.5 block text-sm leading-relaxed text-ink-600">{body}</span>
                      </span>
                    </li>
                  ))}
                </ol>
                <ButtonLink href={col.cta[1]} className="mt-8" variant="secondary">
                  {col.cta[0]} →
                </ButtonLink>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* AI assistant band */}
      <section className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-brand-700 via-brand-800 to-brand-950 px-6 py-12 text-white sm:px-12 sm:py-14">
          <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-white/10 blur-2xl" aria-hidden />
          <div className="relative grid items-center gap-8 md:grid-cols-[1.4fr_1fr]">
            <div>
              <h2 className="text-2xl font-extrabold tracking-tight sm:text-4xl">Not sure which car to buy?</h2>
              <p className="mt-3 max-w-xl text-brand-100">
                Tell our AI assistant your budget, how you drive and who rides with you. It suggests what
                suits you, then shows matching cars from real listings.
              </p>
              <div className="mt-6">
                <OpenChatButton className="!bg-white !text-brand-800 hover:!bg-brand-50">
                  Chat with the assistant
                </OpenChatButton>
              </div>
            </div>
            <ul className="space-y-3 text-sm text-brand-50">
              {[
                "“A reliable family car under $8,000”",
                "“Something tough for bad roads”",
                "“First car, easy to maintain”",
              ].map((q) => (
                <li key={q} className="rounded-2xl bg-white/10 px-4 py-3 ring-1 ring-white/15">
                  {q}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>
    </>
  );
}
