"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { Logo } from "@/components/brand/logo";
import { AdvisorWidget } from "@/components/chat/advisor-widget";
import { VerifyBanner } from "@/components/layout/verify-banner";
import { Icon, type IconName } from "@/components/ui/icon";
import { PageSpinner } from "@/components/ui/spinner";
import { Sheet } from "@/components/ui/sheet";
import { useAdvisorChat } from "@/context/advisor-chat";
import { useAuth } from "@/context/auth";
import {
  canInspect,
  canListCars,
  canManagePayments,
  canViewAllListings,
  hasPermission,
  isSuperAdmin,
  roleLabel,
} from "@/lib/access";
import { getDashboardSummary } from "@/lib/api";
import { cn } from "@/lib/cn";
import type { User } from "@/lib/types";

interface NavItem {
  href: string;
  label: string;
  icon: IconName;
  badge?: number;
  /** Highlight only on an exact match (the Overview link). */
  exact?: boolean;
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

/** The sidebar for one person: only what their role and permissions allow. */
function navFor(user: User, counts: { unread: number; inspections: number; payments: number }): NavGroup[] {
  const main: NavItem[] = [{ href: "/dashboard", label: "Overview", icon: "grid", exact: true }];

  if (canViewAllListings(user)) {
    main.push({ href: "/dashboard/listings", label: "Listings", icon: "car" });
  } else if (canListCars(user)) {
    main.push({ href: "/dashboard/listings", label: "My listings", icon: "car" });
  } else if (user.role === "buyer") {
    main.push({ href: "/dashboard/listings", label: "Sell a car", icon: "tag" });
  }
  if (canInspect(user)) {
    main.push({ href: "/dashboard/inspections", label: "Inspections", icon: "clipboard", badge: counts.inspections });
  }
  main.push(
    { href: "/dashboard/enquiries", label: "Enquiries", icon: "chat", badge: counts.unread },
    {
      href: "/dashboard/orders",
      label: canManagePayments(user) ? "Orders & payments" : "Orders",
      icon: "receipt",
      badge: counts.payments,
    },
  );

  const groups: NavGroup[] = [{ title: "Main", items: main }];

  const admin: NavItem[] = [];
  if (hasPermission(user, "manage_users")) admin.push({ href: "/dashboard/users", label: "Users", icon: "users" });
  if (isSuperAdmin(user)) admin.push({ href: "/dashboard/team", label: "Team", icon: "shield" });
  if (admin.length > 0) groups.push({ title: "Admin", items: admin });

  groups.push({
    title: "Account",
    items: [{ href: "/dashboard/settings", label: "Settings & payouts", icon: "settings" }],
  });
  return groups;
}

function SidebarContent({
  user,
  groups,
  onNavigate,
  onLogout,
}: {
  user: User;
  groups: NavGroup[];
  onNavigate?: () => void;
  onLogout: () => void;
}) {
  const pathname = usePathname();
  const { setOpen: setChatOpen } = useAdvisorChat();

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-16 flex-shrink-0 items-center px-5">
        <Logo onDark className="h-9" href="/dashboard" />
      </div>

      <nav className="night-scroll flex-1 space-y-6 overflow-y-auto px-3 py-4" aria-label="Dashboard">
        {groups.map((group) => (
          <div key={group.title}>
            <p className="px-3 pb-2 text-[11px] font-bold uppercase tracking-widest text-night-muted/70">
              {group.title}
            </p>
            <ul className="space-y-1">
              {group.items.map((item) => {
                const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={onNavigate}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-semibold transition",
                        active
                          ? "bg-accent text-white shadow-glow"
                          : "text-night-muted hover:bg-night-700 hover:text-night-text",
                      )}
                    >
                      <Icon name={item.icon} />
                      <span className="flex-1">{item.label}</span>
                      {!!item.badge && item.badge > 0 && (
                        <span
                          className={cn(
                            "min-w-5 rounded-full px-1.5 py-0.5 text-center text-[11px] font-bold",
                            active ? "bg-white/25 text-white" : "bg-accent text-white",
                          )}
                        >
                          {item.badge > 99 ? "99+" : item.badge}
                        </span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}

        <div>
          <p className="px-3 pb-2 text-[11px] font-bold uppercase tracking-widest text-night-muted/70">Site</p>
          <ul className="space-y-1">
            <li>
              <Link
                href="/cars"
                onClick={onNavigate}
                className="flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-semibold text-night-muted transition hover:bg-night-700 hover:text-night-text"
              >
                <Icon name="store" /> Browse cars
              </Link>
            </li>
            <li>
              <button
                onClick={() => {
                  onNavigate?.();
                  setChatOpen(true);
                }}
                className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-left text-sm font-semibold text-night-muted transition hover:bg-night-700 hover:text-night-text"
              >
                <Icon name="spark" /> AutoTrustAI
              </button>
            </li>
          </ul>
        </div>
      </nav>

      <div className="flex-shrink-0 border-t border-night-line p-4">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-accent to-brand-700 text-sm font-extrabold text-white">
            {user.email[0].toUpperCase()}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-night-text">{user.email}</p>
            <p className="text-xs text-night-muted">{roleLabel(user.role)}</p>
          </div>
        </div>
        <button
          onClick={onLogout}
          className="mt-3 flex min-h-10 w-full items-center justify-center gap-2 rounded-xl border border-night-line text-sm font-semibold text-night-muted transition hover:bg-night-700 hover:text-night-text"
        >
          <Icon name="logout" className="h-4 w-4" /> Log out
        </button>
      </div>
    </div>
  );
}

/** The dark dashboard frame: sidebar on desktop, a slide-in drawer on phones,
 * a top bar with the inbox bell, and a guard that sends logged-out visitors
 * to the login page. */
export function DashboardShell({ children }: { children: ReactNode }) {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [drawer, setDrawer] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.replace(`/login?next=${encodeURIComponent(pathname)}`);
  }, [loading, user, pathname, router]);

  // Shared with the overview page, so this costs no extra request there.
  const { data: summary } = useQuery({
    queryKey: ["dashboard-summary"],
    queryFn: getDashboardSummary,
    enabled: !!user,
    refetchInterval: 60_000,
  });

  if (loading || !user) {
    return (
      <div data-theme="night" className="min-h-screen bg-night-950">
        <PageSpinner />
      </div>
    );
  }

  const stats = summary?.stats;
  const groups = navFor(user, {
    unread: stats?.unread_enquiries ?? 0,
    inspections: canInspect(user) ? (stats?.inspections_pending ?? 0) : 0,
    payments: (stats?.payments_to_confirm ?? 0) + (stats?.payouts_due ?? 0),
  });

  function handleLogout() {
    logout();
    router.push("/");
  }

  return (
    <div data-theme="night" className="min-h-screen bg-night-950 text-night-text">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-night-line bg-night-900 lg:block">
        <SidebarContent user={user} groups={groups} onLogout={handleLogout} />
      </aside>

      <Sheet open={drawer} onClose={() => setDrawer(false)} title="Menu" side="left" className="bg-night-900">
        <SidebarContent user={user} groups={groups} onNavigate={() => setDrawer(false)} onLogout={handleLogout} />
      </Sheet>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-night-line bg-night-950/85 px-4 backdrop-blur sm:px-6">
          <button
            onClick={() => setDrawer(true)}
            aria-label="Open menu"
            className="flex h-11 w-11 items-center justify-center rounded-xl text-night-muted transition hover:bg-night-700 hover:text-night-text lg:hidden"
          >
            <Icon name="menu" className="h-6 w-6" />
          </button>
          <Link href="/cars" className="hidden text-sm font-medium text-night-muted hover:text-night-text sm:block">
            ← Back to the site
          </Link>
          <div className="flex-1" />
          <Link
            href="/dashboard/enquiries"
            aria-label={`Enquiries${stats?.unread_enquiries ? `, ${stats.unread_enquiries} unread` : ""}`}
            className="relative flex h-11 w-11 items-center justify-center rounded-xl text-night-muted transition hover:bg-night-700 hover:text-night-text"
          >
            <Icon name="bell" />
            {!!stats?.unread_enquiries && (
              <span className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full bg-accent ring-2 ring-night-950" />
            )}
          </Link>
          <span className="hidden rounded-full bg-night-700 px-3 py-1 text-xs font-semibold text-night-text sm:block">
            {roleLabel(user.role)}
          </span>
        </header>

        <main className="px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <VerifyBanner dark className="mb-6" />
          {children}
        </main>
      </div>
      <AdvisorWidget />
    </div>
  );
}

/** Title block at the top of every dashboard page. */
export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-night-text sm:text-3xl">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-night-muted">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
