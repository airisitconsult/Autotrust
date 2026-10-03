"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { Panel } from "@/components/dashboard/cards";
import { PageHeader } from "@/components/dashboard/shell";
import { Button } from "@/components/ui/button";
import { ErrorNote, Input, Select } from "@/components/ui/fields";
import { Skeleton } from "@/components/ui/spinner";
import { useAuth } from "@/context/auth";
import { hasPermission, roleLabel } from "@/lib/access";
import { extractErrorMessage, listUsers, setUserRole } from "@/lib/api";
import { formatDate } from "@/lib/format";
import type { User, UserRole } from "@/lib/types";

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
    <li className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5">
      <div className="min-w-0">
        <p className="truncate font-semibold text-night-text">{user.email}</p>
        <p className="text-xs text-night-muted">
          Joined {formatDate(user.created_at)} · {user.email_verified ? "email verified" : "email not verified"}
        </p>
      </div>
      {locked ? (
        <span className="rounded-full bg-night-700 px-3 py-1 text-xs font-semibold text-night-text">
          {roleLabel(user.role)}
        </span>
      ) : (
        <Select
          value={user.role}
          disabled={mutation.isPending}
          aria-label={`Role for ${user.email}`}
          onChange={(e) => mutation.mutate(e.target.value as (typeof ASSIGNABLE)[number])}
          className="!h-10 w-40"
        >
          {ASSIGNABLE.map((r) => (
            <option key={r} value={r}>
              {roleLabel(r)}
            </option>
          ))}
        </Select>
      )}
    </li>
  );
}

export default function UsersPage() {
  const { user: me } = useAuth();
  const [search, setSearch] = useState("");
  const [q, setQ] = useState("");
  const [role, setRole] = useState<UserRole | "">("");
  const [page, setPage] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const allowed = hasPermission(me, "manage_users");

  const { data, isLoading } = useQuery({
    queryKey: ["admin-users", q, role, page],
    queryFn: () => listUsers({ q: q || undefined, role: role || undefined, limit: PAGE_SIZE, offset: page * PAGE_SIZE }),
    enabled: allowed,
  });

  if (me && !allowed) {
    return <p className="rounded-2xl border border-night-line bg-night-800 p-6 text-night-muted">You need the manage users permission to view this page.</p>;
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    setPage(0);
    setQ(search.trim());
  }

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Users" subtitle="Assign the buyer, seller or inspector role. Admin accounts are managed by the super admin." />
      <form onSubmit={submit} className="mb-4 flex flex-wrap gap-3">
        <Input
          placeholder="Search by email"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="min-w-0 flex-1"
          aria-label="Search by email"
        />
        <Select
          value={role}
          onChange={(e) => {
            setRole(e.target.value as UserRole | "");
            setPage(0);
          }}
          aria-label="Filter by role"
          className="w-44"
        >
          <option value="">All roles</option>
          {(["buyer", "seller", "inspector", "admin", "super_admin"] as const).map((r) => (
            <option key={r} value={r}>
              {roleLabel(r)}
            </option>
          ))}
        </Select>
        <Button type="submit">Search</Button>
      </form>
      {error && (
        <div className="mb-4">
          <ErrorNote>{error}</ErrorNote>
        </div>
      )}
      <Panel className="!p-0 overflow-hidden">
        {isLoading ? (
          <Skeleton className="m-5 h-40 !bg-night-700" />
        ) : data && data.length > 0 ? (
          <ul className="divide-y divide-night-line">
            {data.map((u) => (
              <UserRow key={u.id} user={u} onError={setError} />
            ))}
          </ul>
        ) : (
          <p className="p-10 text-center text-sm text-night-muted">No users match.</p>
        )}
        <div className="flex items-center justify-between border-t border-night-line px-5 py-3">
          <Button size="sm" variant="secondary" disabled={page === 0} onClick={() => setPage((p) => Math.max(0, p - 1))}>
            ← Previous
          </Button>
          <span className="text-sm text-night-muted">Page {page + 1}</span>
          <Button size="sm" variant="secondary" disabled={!data || data.length < PAGE_SIZE} onClick={() => setPage((p) => p + 1)}>
            Next →
          </Button>
        </div>
      </Panel>
    </div>
  );
}
