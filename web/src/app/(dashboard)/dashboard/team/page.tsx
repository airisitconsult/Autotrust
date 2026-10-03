"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { Panel, PanelTitle } from "@/components/dashboard/cards";
import { PageHeader } from "@/components/dashboard/shell";
import { Button } from "@/components/ui/button";
import { ErrorNote, Field, Input, SuccessNote } from "@/components/ui/fields";
import { useAuth } from "@/context/auth";
import { isSuperAdmin } from "@/lib/access";
import {
  createMajorAdmin,
  extractErrorMessage,
  listMajorAdmins,
  listPermissions,
  removeMajorAdmin,
  setMajorAdminPermissions,
} from "@/lib/api";
import { formatDate, titleCase } from "@/lib/format";
import type { Permission, User } from "@/lib/types";

function PermissionPicker({
  selected,
  onChange,
}: {
  selected: Permission[];
  onChange: (next: Permission[]) => void;
}) {
  const { data: catalogue } = useQuery({ queryKey: ["permissions"], queryFn: listPermissions });
  return (
    <div className="grid gap-2.5 sm:grid-cols-2">
      {catalogue?.map((p) => {
        const on = selected.includes(p.value);
        return (
          <label
            key={p.value}
            className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition ${
              on ? "border-accent/60 bg-accent/10" : "border-night-line hover:bg-night-700/50"
            }`}
          >
            <input
              type="checkbox"
              checked={on}
              onChange={(e) =>
                onChange(e.target.checked ? [...selected, p.value] : selected.filter((x) => x !== p.value))
              }
              className="mt-0.5 h-4 w-4 rounded border-night-line text-accent focus:ring-accent"
            />
            <span>
              <span className="block text-sm font-semibold text-night-text">{titleCase(p.value)}</span>
              <span className="block text-xs text-night-muted">{p.description}</span>
            </span>
          </label>
        );
      })}
    </div>
  );
}

function AdminCard({ admin }: { admin: User }) {
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<Permission[]>(admin.permissions);
  const [error, setError] = useState<string | null>(null);
  const dirty = draft.length !== admin.permissions.length || draft.some((p) => !admin.permissions.includes(p));

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
    <Panel>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-bold text-night-text">{admin.email}</p>
          <p className="text-xs text-night-muted">Added {formatDate(admin.created_at)}</p>
        </div>
        <Button
          variant="danger"
          size="sm"
          disabled={remove.isPending}
          onClick={() => {
            if (confirm(`Remove admin access for ${admin.email}? They keep a normal buyer account.`)) remove.mutate();
          }}
        >
          Remove access
        </Button>
      </div>
      <div className="mt-4">
        <PermissionPicker selected={draft} onChange={setDraft} />
      </div>
      {error && (
        <div className="mt-3">
          <ErrorNote>{error}</ErrorNote>
        </div>
      )}
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Button size="sm" onClick={() => save.mutate()} disabled={!dirty || save.isPending}>
          {save.isPending ? "Saving…" : "Save permissions"}
        </Button>
        {dirty && (
          <Button size="sm" variant="ghost" onClick={() => setDraft(admin.permissions)}>
            Discard
          </Button>
        )}
        {draft.length === 0 && <span className="text-xs text-gold-400">No permissions: this admin can&apos;t do anything yet.</span>}
      </div>
    </Panel>
  );
}

function CreateAdmin() {
  const queryClient = useQueryClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<string | null>(null);

  const create = useMutation({
    mutationFn: () => createMajorAdmin({ email, password, permissions }),
    onSuccess: (a) => {
      setCreated(a.email);
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

  function submit(e: FormEvent) {
    e.preventDefault();
    setCreated(null);
    create.mutate();
  }

  return (
    <Panel>
      <PanelTitle>Add a major admin</PanelTitle>
      <p className="-mt-2 mb-4 text-sm text-night-muted">
        Creates the account and sets what it may do. Share the temporary password with them securely.
      </p>
      <form onSubmit={submit} className="space-y-4">
        {created && <SuccessNote>Created {created}.</SuccessNote>}
        {error && <ErrorNote>{error}</ErrorNote>}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Email" htmlFor="adm-email">
            <Input id="adm-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </Field>
          <Field label="Temporary password" htmlFor="adm-pass">
            <Input
              id="adm-pass"
              type="password"
              required
              minLength={8}
              maxLength={72}
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </Field>
        </div>
        <div>
          <p className="mb-2 text-sm font-medium text-night-text">Permissions</p>
          <PermissionPicker selected={permissions} onChange={setPermissions} />
        </div>
        <Button type="submit" disabled={create.isPending}>
          {create.isPending ? "Creating…" : "Create major admin"}
        </Button>
      </form>
    </Panel>
  );
}

export default function TeamPage() {
  const { user } = useAuth();
  const allowed = isSuperAdmin(user);
  const { data: admins, isLoading } = useQuery({
    queryKey: ["major-admins"],
    queryFn: listMajorAdmins,
    enabled: allowed,
  });

  if (user && !allowed) {
    return <p className="rounded-2xl border border-night-line bg-night-800 p-6 text-night-muted">Only the super admin can manage the admin team.</p>;
  }

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="Team"
        subtitle="Major admins are your support staff. Only you can create them and decide what each may do; changes apply immediately."
      />
      <div className="space-y-5">
        <CreateAdmin />
        <div>
          <h2 className="mb-3 font-bold text-night-text">Major admins {admins ? `(${admins.length})` : ""}</h2>
          {isLoading && <p className="text-sm text-night-muted">Loading…</p>}
          {admins && admins.length === 0 && (
            <p className="rounded-2xl border border-dashed border-night-line p-8 text-center text-sm text-night-muted">No major admins yet.</p>
          )}
          <div className="space-y-4">
            {admins?.map((a) => (
              <AdminCard key={a.id} admin={a} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
