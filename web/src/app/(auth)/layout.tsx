import Link from "next/link";
import { Logo } from "@/components/brand/logo";

const points = [
  "Every Vetted car is inspected in person",
  "Inspection reports written in plain English",
  "Find cars near you by state and LGA",
];

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-[1fr_1.05fr]">
      {/* Brand panel (desktop) */}
      <aside className="relative isolate hidden overflow-hidden bg-brand-950 p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="absolute -left-24 top-1/3 -z-10 h-96 w-96 rounded-full bg-brand-500/30 blur-3xl" aria-hidden />
        <div className="absolute -bottom-32 -right-20 -z-10 h-96 w-96 rounded-full bg-trust-500/20 blur-3xl" aria-hidden />
        <Logo onDark className="h-12" />
        <div>
          <h2 className="max-w-md text-4xl font-extrabold leading-tight tracking-tight">
            The used-car marketplace you can{" "}
            <span className="bg-gradient-to-r from-brand-300 to-trust-300 bg-clip-text text-transparent">trust.</span>
          </h2>
          <ul className="mt-8 space-y-4">
            {points.map((p) => (
              <li key={p} className="flex items-center gap-3 text-brand-100">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-trust-500 text-xs font-bold text-white">
                  ✓
                </span>
                {p}
              </li>
            ))}
          </ul>
        </div>
        <p className="text-sm text-brand-200/70">Verified. Secure. Reliable.</p>
      </aside>

      {/* Form */}
      <main className="flex flex-col bg-white">
        <div className="flex items-center justify-between px-5 py-4 lg:hidden">
          <Logo className="h-9" />
          <Link href="/" className="text-sm font-medium text-ink-500">
            Back to site
          </Link>
        </div>
        <div className="flex flex-1 items-center justify-center px-5 py-8 sm:px-10">
          <div className="w-full max-w-md">{children}</div>
        </div>
      </main>
    </div>
  );
}
