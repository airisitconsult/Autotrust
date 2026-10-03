"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState, type FormEvent } from "react";
import { Panel, PanelTitle } from "@/components/dashboard/cards";
import { PageHeader } from "@/components/dashboard/shell";
import { Button } from "@/components/ui/button";
import { ErrorNote, Field, Input, SuccessNote } from "@/components/ui/fields";
import { useAuth } from "@/context/auth";
import { roleLabel } from "@/lib/access";
import {
  becomeSeller,
  extractErrorMessage,
  getBankDetails,
  getPlatformInfo,
  resendVerification,
  saveBankDetails,
} from "@/lib/api";
import { formatDate } from "@/lib/format";

function EmailPanel() {
  const { user } = useAuth();
  const [state, setState] = useState<"idle" | "sent" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const resend = useMutation({
    mutationFn: resendVerification,
    onSuccess: () => setState("sent"),
    onError: (err) => {
      setError(extractErrorMessage(err));
      setState("error");
    },
  });
  if (!user) return null;

  return (
    <Panel>
      <PanelTitle>Email address</PanelTitle>
      <p className="text-night-text">{user.email}</p>
      {user.email_verified ? (
        <p className="mt-2 inline-flex items-center gap-2 rounded-full bg-trust-500/15 px-3 py-1 text-sm font-semibold text-trust-300">
          ✓ Verified
        </p>
      ) : (
        <div className="mt-3 space-y-3">
          <p className="text-sm text-gold-400">
            Not verified yet. You need a verified email to list cars, send enquiries and buy.
          </p>
          {state === "sent" ? (
            <SuccessNote>Sent. Check your inbox (and spam folder).</SuccessNote>
          ) : (
            <Button size="sm" onClick={() => resend.mutate()} disabled={resend.isPending}>
              {resend.isPending ? "Sending…" : "Send a new verification email"}
            </Button>
          )}
          {state === "error" && error && <ErrorNote>{error}</ErrorNote>}
        </div>
      )}
    </Panel>
  );
}

function RolePanel() {
  const { user, refreshUser } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const mutation = useMutation({
    mutationFn: becomeSeller,
    onSuccess: refreshUser,
    onError: (err) => setError(extractErrorMessage(err)),
  });
  if (!user) return null;

  return (
    <Panel>
      <PanelTitle>Account type</PanelTitle>
      <p className="text-night-text">
        {roleLabel(user.role)}
        <span className="ml-2 text-sm text-night-muted">· joined {formatDate(user.created_at)}</span>
      </p>
      {user.role === "buyer" && (
        <div className="mt-3 space-y-3">
          <p className="text-sm text-night-muted">Want to sell a car too? Switch to a seller account — it&apos;s free.</p>
          {error && <ErrorNote>{error}</ErrorNote>}
          <Button size="sm" onClick={() => mutation.mutate()} disabled={mutation.isPending}>
            {mutation.isPending ? "Switching…" : "Switch to a seller account"}
          </Button>
        </div>
      )}
    </Panel>
  );
}

function BankPanel() {
  const { user, refreshUser } = useAuth();
  const queryClient = useQueryClient();
  const { data: saved, isLoading } = useQuery({ queryKey: ["bank-details"], queryFn: getBankDetails });
  const { data: platform } = useQuery({ queryKey: ["platform"], queryFn: getPlatformInfo });
  const [bank, setBank] = useState("");
  const [number, setNumber] = useState("");
  const [name, setName] = useState("");
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (saved) {
      setBank(saved.bank_name);
      setNumber(saved.account_number);
      setName(saved.account_name);
    }
  }, [saved]);

  const save = useMutation({
    mutationFn: () => saveBankDetails({ bank_name: bank.trim(), account_number: number.trim(), account_name: name.trim() }),
    onSuccess: async () => {
      setError(null);
      setDone(true);
      await refreshUser();
      queryClient.invalidateQueries({ queryKey: ["bank-details"] });
    },
    onError: (err) => {
      setDone(false);
      setError(extractErrorMessage(err));
    },
  });

  if (!user || user.role === "inspector") return null;
  const feePct = platform ? Math.round(platform.fee_rate * 100) : 5;

  function submit(e: FormEvent) {
    e.preventDefault();
    setDone(false);
    setError(null);
    save.mutate();
  }

  return (
    <Panel className="lg:col-span-2">
      <PanelTitle>Payout account</PanelTitle>
      <p className="mb-4 max-w-2xl text-sm text-night-muted">
        When you sell a car, AutoTrust pays you {100 - feePct}% of the price here once the buyer confirms they have
        it. Only you and the AutoTrust payments team can see these details.
      </p>
      {isLoading ? (
        <p className="text-sm text-night-muted">Loading…</p>
      ) : (
        <form onSubmit={submit} className="grid max-w-2xl gap-4 sm:grid-cols-3">
          <Field label="Bank" htmlFor="bank">
            <Input id="bank" required minLength={2} placeholder="GTBank" value={bank} onChange={(e) => setBank(e.target.value)} />
          </Field>
          <Field label="Account number" htmlFor="acct" hint="10 digits">
            <Input
              id="acct"
              required
              inputMode="numeric"
              pattern="\d{10}"
              maxLength={10}
              title="A 10-digit account number"
              value={number}
              onChange={(e) => setNumber(e.target.value.replace(/\D/g, ""))}
            />
          </Field>
          <Field label="Account name" htmlFor="acctname">
            <Input id="acctname" required minLength={2} value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
          <div className="space-y-3 sm:col-span-3">
            {done && <SuccessNote>Saved.</SuccessNote>}
            {error && <ErrorNote>{error}</ErrorNote>}
            <Button type="submit" disabled={save.isPending}>
              {save.isPending ? "Saving…" : saved ? "Update payout account" : "Save payout account"}
            </Button>
          </div>
        </form>
      )}
    </Panel>
  );
}

export default function SettingsPage() {
  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader title="Settings & payouts" subtitle="Your account, email and where your sale proceeds are sent." />
      <div className="grid gap-5 lg:grid-cols-2">
        <EmailPanel />
        <RolePanel />
        <BankPanel />
      </div>
    </div>
  );
}
