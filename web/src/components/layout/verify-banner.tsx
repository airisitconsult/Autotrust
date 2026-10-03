"use client";

import { useState } from "react";
import { useAuth } from "@/context/auth";
import { extractErrorMessage, resendVerification } from "@/lib/api";
import { cn } from "@/lib/cn";

/** A slim notice for signed-in users whose email isn't confirmed yet. They can
 * browse, but listing, enquiring and buying need a verified address. */
export function VerifyBanner({ className, dark = false }: { className?: string; dark?: boolean }) {
  const { user } = useAuth();
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  if (!user || user.email_verified) return null;

  async function resend() {
    setState("sending");
    try {
      await resendVerification();
      setState("sent");
    } catch (err) {
      setError(extractErrorMessage(err));
      setState("error");
    }
  }

  return (
    <div
      role="status"
      className={cn(
        "flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-2.5 text-sm",
        dark ? "rounded-2xl bg-gold-500/15 text-gold-400" : "bg-gold-100 text-gold-700",
        className,
      )}
    >
      <p>
        <strong>Verify your email</strong> to list cars, send enquiries and buy. We sent a link to{" "}
        <span className="font-semibold">{user.email}</span>.
      </p>
      {state === "sent" ? (
        <span className="font-semibold">Sent. Check your inbox (and spam).</span>
      ) : (
        <button
          onClick={resend}
          disabled={state === "sending"}
          className="rounded-lg bg-ink-950/90 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-ink-950 disabled:opacity-60"
        >
          {state === "sending" ? "Sending…" : "Resend email"}
        </button>
      )}
      {state === "error" && error && <p className="w-full text-xs text-red-700">{error}</p>}
    </div>
  );
}
