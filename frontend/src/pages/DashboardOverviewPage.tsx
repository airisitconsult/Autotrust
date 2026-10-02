import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { listPendingInspections } from "../api/inspections";
import { listMyVehicles } from "../api/vehicles";
import { DashboardLayout } from "../components/DashboardLayout";
import { useAuth } from "../context/AuthContext";
import { canInspect } from "../lib/access";

function StatCard({
  label,
  value,
  accent,
  icon,
}: {
  label: string;
  value: number | string;
  accent: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-slate-500">{label}</p>
        <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${accent}`}>
          {icon}
        </div>
      </div>
      <p className="mt-2 text-3xl font-extrabold text-slate-900">{value}</p>
    </div>
  );
}

export function DashboardOverviewPage() {
  const { user } = useAuth();
  const isInspector = canInspect(user);

  const vehiclesQuery = useQuery({ queryKey: ["my-vehicles"], queryFn: listMyVehicles });
  const pendingQuery = useQuery({
    queryKey: ["pending-inspections"],
    queryFn: listPendingInspections,
    enabled: isInspector,
  });

  const vehicles = vehiclesQuery.data ?? [];
  const listed = vehicles.filter((v) => v.status === "listed").length;
  const vetted = vehicles.filter((v) => v.is_vetted).length;
  const sold = vehicles.filter((v) => v.status === "sold").length;

  return (
    <DashboardLayout title="Overview">
      <div className="flex flex-col gap-6">
      <p className="text-slate-500">
        Welcome back, {user?.email.split("@")[0]}. Here's what's happening with your account.
      </p>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Active Listings"
          value={listed}
          accent="bg-brand-50 text-brand-600"
          icon={
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" className="h-5 w-5">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 13l1.5-4.5A2 2 0 016.4 7h11.2a2 2 0 011.9 1.5L21 13m-18 0v5a1 1 0 001 1h1a1 1 0 001-1v-1h12v1a1 1 0 001 1h1a1 1 0 001-1v-5m-18 0h18" />
            </svg>
          }
        />
        <StatCard
          label="Vetted Vehicles"
          value={vetted}
          accent="bg-emerald-50 text-emerald-600"
          icon={
            <svg fill="currentColor" viewBox="0 0 20 20" className="h-5 w-5">
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
                clipRule="evenodd"
              />
            </svg>
          }
        />
        <StatCard
          label="Sold"
          value={sold}
          accent="bg-slate-100 text-slate-600"
          icon={
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" className="h-5 w-5">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
        {isInspector && (
          <StatCard
            label="Pending Inspections"
            value={pendingQuery.data?.length ?? 0}
            accent="bg-amber-50 text-amber-600"
            icon={
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" className="h-5 w-5">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
          />
        )}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="font-semibold text-slate-900">Quick actions</h2>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link
            to="/create-listing"
            className="rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700"
          >
            + List a vehicle
          </Link>
          <Link
            to="/my-listings"
            className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Manage listings
          </Link>
          {isInspector && (
            <Link
              to="/inspector"
              className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Review inspection queue
            </Link>
          )}
        </div>
      </div>
      </div>
    </DashboardLayout>
  );
}
