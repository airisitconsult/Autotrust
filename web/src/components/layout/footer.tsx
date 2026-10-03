import Link from "next/link";
import { Logo } from "@/components/brand/logo";
const columns = [
  {
    title: "Buy",
    links: [
      { href: "/cars", label: "Browse cars" },
      { href: "/cars?is_vetted=true", label: "Vetted cars only" },
      { href: "/advisor", label: "AI car advisor" },
    ],
  },
  {
    title: "Sell",
    links: [
      { href: "/dashboard/listings/new", label: "List your car" },
      { href: "/dashboard/listings", label: "My listings" },
      { href: "/#how-it-works", label: "How vetting works" },
    ],
  },
  {
    title: "Account",
    links: [
      { href: "/login", label: "Log in" },
      { href: "/register", label: "Create account" },
      { href: "/dashboard", label: "Dashboard" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="bg-ink-950 text-ink-300">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-10 md:grid-cols-[1.4fr_repeat(3,1fr)]">
          <div className="max-w-sm">
            <Logo onDark className="h-11" />
            <p className="mt-4 text-sm leading-relaxed text-ink-400">
              Verified. Secure. Reliable. Every AutoTrust Vetted car is physically inspected by a
              real person, then explained in plain language by AI.
            </p>
          </div>
          {columns.map((col) => (
            <div key={col.title}>
              <h3 className="text-sm font-semibold text-white">{col.title}</h3>
              <ul className="mt-4 space-y-2.5">
                {col.links.map((l) => (
                  <li key={l.href}>
                    <Link href={l.href} className="text-sm text-ink-400 transition hover:text-white">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-10 flex flex-col gap-2 border-t border-white/10 pt-6 text-xs text-ink-500 sm:flex-row sm:justify-between">
          <p>© {new Date().getFullYear()} AutoTrust. All rights reserved.</p>
          <p>AI-powered vehicle certification marketplace</p>
        </div>
      </div>
    </footer>
  );
}
