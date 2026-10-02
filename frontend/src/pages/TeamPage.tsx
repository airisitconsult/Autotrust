import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import {
  createMajorAdmin,
  listMajorAdmins,
  listPermissions,
  removeMajorAdmin,
  setMajorAdminPermissions,
} from "../api/admin";
import { extractErrorMessage } from "../api/client";
import { DashboardLayout } from "../components/DashboardLayout";
import type { Permission, User } from "../types";

function PermissionPicker({
  selected,
  onChange,
}: {
  selected: Permission[];
  onChange: (next: Permission[]) => void;
}) {
  const { data: catalogue } = useQuery({ queryKey: ["permissions"], queryFn: listPermissions });

  return (
    <div className="space-y-2">
      {catalogue?.map((p) => (
        <label key={p.value} className="flex items-start gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={selected.includes(p.value)}
            onChange={(e) =>
              onChange(e.target.checked ? [...selected, p.value] : selected.filter((x) => x !== p.value))
            }
            className="mt-0.5 h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
          />
          <span>
            <span className="font-medium">{p.value.replaceAll("_", " ")}</span>
            <span className="block text-xs text-slate-500">{p.description}</span>
          </span>
        </label>
      ))}
    </div>
  );
}

function AdminRow({ admin }: { admin: User }) {
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<Permission[]>(admin.permissions);
  const [error, setError] = useState<string | null>(null);

  const dirty =
    draft.length !== admin.permissions.length || draft.some((p) => !admin.permissions.includes(p));

  const save = useMutation({
    mutationFn: () => setMajorAdminPermissions(admin.id, draft),
    onSuccess: () => {
      setError(null);
      queryClient.invalidateQueries({ queryKey: ["major-admins"] });
    },
    onError: (err) => setError(extractErrorMessage(err)),
  });

  const remove = useMutation({
    mutationFn: () => removeMajorAdmin(admin.id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["major-admins"] }),
    onError: (err) => setError(extractErrorMessage(err)),
  });

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-semibold text-slate-900">{admin.email}</p>
          <p className="text-xs text-slate-500">
            Added {new Date(admin.created_at).toLocaleDateString()}
          </p>
        </div>
        <button
          onClick={() => {
            if (confirm(`Remove admin access for ${admin.email}? They keep a normal buyer account.`)) {
              remove.mutate();
            }
          }}
          disabled={remove.isPending}
          className="rounded-lg px-3 py-1.5 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
        >
          Remove access
        </button>
      </div>

      <div className="mt-4">
        <PermissionPicker selected={draft} onChange={setDraft} />
      </div>

      {error && <p className="mt-3 rounded-lg bg-red-50 p-2 text-sm text-red-700">{error}</p>}

      <div className="mt-4 flex items-center gap-3">
        <button
          onClick={() => save.mutate()}
          disabled={!dirty || save.isPending}
          className="rounded-lg bg-brand-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-40"
        >
          {save.isPending ? "Saving…" : "Save permissions"}
        </button>
        {dirty && (
          <button
            onClick={() => setDraft(admin.permissions)}
            className="text-sm text-slate-500 hover:text-slate-700"
          >
            Discard
          </button>
        )}
        {draft.length === 0 && (
          <span className="text-xs text-amber-600">No permissions — this admin can't do anything yet.</span>
        )}
      </div>
    </div>
  );
}

function CreateAdminForm() {
  const queryClient = useQueryClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<string | null>(null);

  const create = useMutation({
    mutationFn: () => createMajorAdmin({ email, password, permissions }),
    onSuccess: (admin) => {
      setCreated(admin.email);
      setError(null);
      setEmail("");
      setPassword("");
      setPermissions([]);
      queryClient.invalidateQueries({ queryKey: ["major-admins"] });
    },
    onError: (err) => {
      setCreated(null);
      setError(extractErrorMessage(err));
    },
  });

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setCreated(null);
    create.mutate();
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="font-semibold text-slate-900">Add a major admin</h2>
      <p className="mt-1 text-sm text-slate-500">
        Creates the account and sets what it may do. Share the temporary password with them securely.
      </p>

      {created && (
        <p className="mt-3 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">
          Created {created}.
        </p>
      )}
      {error && <p className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="text-sm font-medium text-slate-700">Email</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-slate-700">Temporary password</label>
          <input
            type="password"
            required
            minLength={8}
            maxLength={72}
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
          />
        </div>
      </div>

      <div className="mt-4">
        <label className="text-sm font-medium text-slate-700">Permissions</label>
        <div className="mt-2">
          <PermissionPicker selected={permissions} onChange={setPermissions} />
        </div>
      </div>

      <button
        type="submit"
        disabled={create.isPending}
        className="mt-5 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
      >
        {create.isPending ? "Creating…" : "Create major admin"}
      </button>
    </form>
  );
}

export function TeamPage() {
  const { data: admins, isLoading } = useQuery({
    queryKey: ["major-admins"],
    queryFn: listMajorAdmins,
  });

  return (
    <DashboardLayout title="Team">
      <p className="mb-6 max-w-2xl text-slate-500">
        Major admins are your support staff. Only you can create them and decide what each one is
        allowed to do; changes take effect immediately.
      </p>

      <div className="flex max-w-3xl flex-col gap-6">
        <CreateAdminForm />

        <div>
          <h2 className="mb-3 font-semibold text-slate-900">
            Major admins {admins ? `(${admins.length})` : ""}
          </h2>
          {isLoading && <p className="text-sm text-slate-400">Loading…</p>}
          {admins && admins.length === 0 && (
            <div className="rounded-xl border border-dashed border-slate-300 p-10 text-center text-slate-500">
              No major admins yet.
            </div>
          )}
          <div className="flex flex-col gap-4">
            {admins?.map((a) => (
              <AdminRow key={a.id} admin={a} />
            ))}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
