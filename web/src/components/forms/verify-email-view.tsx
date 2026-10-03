"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ButtonLink } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { VerifyBanner } from "@/components/layout/verify-banner";
import { useAuth } from "@/context/auth";
import { extractErrorMessage, verifyEmail } from "@/lib/api";

type State = { phase: "checking" } | { phase: "verified" } | { phase: "failed"; message: string };

/** The page the emailed link opens: confirms the token, then sends them on. */
export function VerifyEmailView() {
  const token = useSearchParams().get("token");
  const { user, refreshUser } = useAuth();
  const [state, setState] = useState<State>(token ? { phase: "checking" } : { phase: "failed", message: "This link is missing its code." });
  // React runs effects twice in development; the token only works once.
  const started = useRef(false);

  useEffect(() => {
    if (!token || started.current) return;
    started.current = true;
    verifyEmail(token)
      .then(async () => {
        await refreshUser();
        setState({ phase: "verified" });
      })
      .catch((err) => setState({ phase: "failed", message: extractErrorMessage(err) }));
  }, [token, refreshUser]);

  if (state.phase === "checking") {
    return (
      <div className="text-center">
        <Spinner className="h-8 w-8" />
        <p className="mt-4 text-ink-600">Confirming your email…</p>
      </div>
    );
  }

  if (state.phase === "verified") {
    return (
      <div className="text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-trust-100 text-3xl text-trust-600">
          ✓
        </div>
        <h1 className="mt-6 text-3xl font-extrabold tracking-tight text-ink-950">Email verified</h1>
        <p className="mt-2 text-ink-500">Thanks! You can now list cars, send enquiries and buy.</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <ButtonLink href="/dashboard">Go to my dashboard</ButtonLink>
          <ButtonLink href="/cars" variant="secondary">
            Browse cars
          </ButtonLink>
        </div>
      </div>
    );
  }

  return (
    <div className="text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-100 text-3xl text-red-600">
        !
      </div>
      <h1 className="mt-6 text-3xl font-extrabold tracking-tight text-ink-950">That link didn&apos;t work</h1>
      <p className="mt-2 text-ink-500">{state.message}</p>
      <div className="mt-8 space-y-4">
        {user ? (
          <VerifyBanner className="rounded-2xl text-left" />
        ) : (
          <ButtonLink href="/login?next=/dashboard">Log in to request a new link</ButtonLink>
        )}
      </div>
    </div>
  );
}
