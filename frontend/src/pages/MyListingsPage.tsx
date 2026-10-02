import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { listMyVehicles } from "../api/vehicles";
import { ConditionBadge, VettedBadge } from "../components/Badge";
import { DashboardLayout } from "../components/DashboardLayout";
import { FullPageSpinner } from "../components/Spinner";

function formatPrice(price: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(price);
}

const statusStyles: Record<string, string> = {
  listed: "bg-emerald-50 text-emerald-700",
  draft: "bg-slate-100 text-slate-600",
  sold: "bg-slate-900 text-white",
};

export function MyListingsPage() {
  const { data: vehicles, isLoading } = useQuery({
    queryKey: ["my-vehicles"],
    queryFn: listMyVehicles,
  });

  return (
    <DashboardLayout title="My Listings">
      <div className="mb-6 flex items-center justify-between">
        <p className="text-slate-500">Manage the vehicles you've listed.</p>
        <Link
          to="/create-listing"
          className="rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700"
        >
          + List a vehicle
        </Link>
      </div>

      {isLoading && <FullPageSpinner />}

      {vehicles && vehicles.length === 0 && (
        <div className="rounded-xl border border-dashed border-slate-300 p-12 text-center text-slate-500">
          You haven't listed any vehicles yet.
        </div>
      )}

      {vehicles && vehicles.length > 0 && (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Vehicle</th>
                <th className="hidden px-4 py-3 sm:table-cell">Price</th>
                <th className="hidden px-4 py-3 md:table-cell">Condition</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {vehicles.map((v) => (
                <tr key={v.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-slate-900">
                        {v.year} {v.make} {v.model}
                      </span>
                      {v.is_vetted && <VettedBadge />}
                    </div>
                  </td>
                  <td className="hidden px-4 py-3 text-slate-600 sm:table-cell">
                    {formatPrice(v.price)}
                  </td>
                  <td className="hidden px-4 py-3 md:table-cell">
                    <ConditionBadge condition={v.condition} />
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${statusStyles[v.status]}`}
                    >
                      {v.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link to={`/vehicles/${v.id}`} className="font-medium text-brand-600 hover:underline">
                      Manage
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </DashboardLayout>
  );
}
