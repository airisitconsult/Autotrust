import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { listUsers, setUserRole } from "../api/admin";
import { extractErrorMessage } from "../api/client";
import { DashboardLayout } from "../components/DashboardLayout";
import { roleLabel } from "../lib/access";
import type { User, UserRole } from "../types";

const PAGE_SIZE = 20;
const ASSIGNABLE = ["buyer", "seller", "inspector"] as const;

function UserRow({ user, onError }: { user: User; onError: (msg: string | null) => void }) {
  const queryClient = useQueryClient();
  const locked = user.role === "admin" || user.role === "super_admin";

  const mutation = useMutation({
    mutationFn: (role: (typeof ASSIGNABLE)[number]) => setUserRole(user.id, role),
    onSuccess: () => {
      onError(null);
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    },
    onError: (err) => onError(extractErrorMessage(err)),
  });

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-slate-900">{user.email}</p>
        <p className="text-xs text-slate-500">
          Joined {new Date(user.created_at).toLocaleDateString()}
        </p>
      </div>
      {locked ? (
        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
          {roleLabel(user.role)}
        </span>
      ) : (
        <select
          value={user.role}
          disabled={mutation.isPending}
          onChange={(e) => mutation.mutate(e.target.value as (typeof ASSIGNABLE)[number])}
          className="rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
        >
          {ASSIGNABLE.map((r) => (
            <option key={r} value={r}>
              {roleLabel(r)}
            </option>
          ))}
        </select>
      )}
    </div>
  );
}

export function UsersPage() {
  const [search, setSearch] = useState("");
  const [q, setQ] = useState("");
  const [role, setRole] = useState<UserRole | "">("");
  const [page, setPage] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const { data: users, isLoading } = useQuery({
    queryKey: ["admin-users", q, role, page],
    queryFn: () =>
      listUsers({
        q: q || undefined,
        role: role || undefined,
        limit: PAGE_SIZE,
        offset: page * PAGE_SIZE,
      }),
  });

  function handleSearch(e: FormEvent) {
    e.preventDefault();
    setPage(0);
    setQ(search.trim());
  }

  return (
    <DashboardLayout title="Users">
      <p className="mb-6 max-w-2xl text-slate-500">
        Assign the buyer, seller or inspector role. Admin accounts are managed by the super admin.
      </p>

      <div className="max-w-3xl">
        <form onSubmit={handleSearch} className="flex flex-wrap gap-3">
          <input
            type="text"
            placeholder="Search by email"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="min-w-0 flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
          />
          <select
            value={role}
            onChange={(e) => {
              setRole(e.target.value as UserRole | "");
              setPage(0);
            }}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
          >
            <option value="">All roles</option>
            {(["buyer", "seller", "inspector", "admin", "super_admin"] as const).map((r) => (
              <option key={r} value={r}>
                {roleLabel(r)}
              </option>
            ))}
          </select>
          <button
            type="submit"
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
          >
            Search
          </button>
        </form>

        {error && <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}

        <div className="mt-4 divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-white shadow-sm">
          {isLoading && <p className="p-4 text-sm text-slate-400">Loading…</p>}
          {users && users.length === 0 && (
            <p className="p-8 text-center text-sm text-slate-500">No users match.</p>
          )}
          {users?.map((u) => (
            <UserRow key={u.id} user={u} onError={setError} />
          ))}
        </div>

        <div className="mt-4 flex items-center justify-between">
          <button
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40"
          >
            &larr; Previous
          </button>
          <span className="text-sm text-slate-500">Page {page + 1}</span>
          <button
            onClick={() => setPage((p) => p + 1)}
            disabled={!users || users.length < PAGE_SIZE}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40"
          >
            Next &rarr;
          </button>
        </div>
      </div>
    </DashboardLayout>
  );
}
