"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { ErrorNote, Field, Input } from "@/components/ui/fields";
import { useAuth } from "@/context/auth";
import { extractErrorMessage } from "@/lib/api";

/** Only follow relative redirects, so a crafted ?next=https://evil.example
 * link can't send someone off-site after they log in. */
function safeNext(value: string | null): string {
  return value && value.startsWith("/") && !value.startsWith("//") ? value : "/dashboard";
}

export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const { user, loading, login, register } = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const next = safeNext(params.get("next"));

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [accountType, setAccountType] = useState<"buyer" | "seller">(
    params.get("as") === "seller" ? "seller" : "buyer",
  );

  const isLogin = mode === "login";

  // Already signed in (or just signed in): go where they were headed.
  useEffect(() => {
    if (!loading && user) router.replace(next);
  }, [loading, user, next, router]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await (isLogin ? login(email, password) : register(email, password, accountType));
    } catch (err) {
      setError(extractErrorMessage(err));
      setSubmitting(false);
    }
  }

  return (
    <div>
      <h1 className="text-3xl font-extrabold tracking-tight text-ink-950">
        {isLogin ? "Welcome back" : "Create your account"}
      </h1>
      <p className="mt-2 text-ink-500">
        {isLogin
          ? "Log in to manage your listings and inspections."
          : "Buy, sell and get your car vetted. It takes a minute."}
      </p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-5">
        {error && <ErrorNote>{error}</ErrorNote>}
        {!isLogin && (
          <fieldset>
            <legend className="mb-1.5 text-sm font-medium text-ink-700">I want to</legend>
            <div className="grid grid-cols-2 gap-3">
              {(
                [
                  ["buyer", "Buy a car", "Browse, enquire and buy"],
                  ["seller", "Sell my car", "List cars, get them vetted"],
                ] as const
              ).map(([value, title, hint]) => (
                <label
                  key={value}
                  className={`cursor-pointer rounded-2xl border p-3.5 transition ${
                    accountType === value
                      ? "border-brand-600 bg-brand-50 ring-2 ring-brand-100"
                      : "border-ink-200 hover:bg-ink-50"
                  }`}
                >
                  <input
                    type="radio"
                    name="account_type"
                    value={value}
                    checked={accountType === value}
                    onChange={() => setAccountType(value)}
                    className="sr-only"
                  />
                  <span className="block text-sm font-bold text-ink-900">{title}</span>
                  <span className="mt-0.5 block text-xs text-ink-500">{hint}</span>
                </label>
              ))}
            </div>
            <p className="mt-1.5 text-xs text-ink-500">You can switch to a seller account later.</p>
          </fieldset>
        )}
        <Field label="Email" htmlFor="email">
          <Input
            id="email"
            type="email"
            required
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </Field>
        <Field
          label="Password"
          htmlFor="password"
          hint={isLogin ? undefined : "Use at least 8 characters."}
        >
          <Input
            id="password"
            type="password"
            required
            minLength={isLogin ? undefined : 8}
            maxLength={72}
            autoComplete={isLogin ? "current-password" : "new-password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </Field>
        <Button type="submit" size="lg" className="w-full" disabled={submitting}>
          {submitting ? "Please wait…" : isLogin ? "Log in" : "Create account"}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-ink-500">
        {isLogin ? "New to AutoTrust?" : "Already have an account?"}{" "}
        <Link
          href={isLogin ? "/register" : "/login"}
          className="font-semibold text-brand-600 hover:underline"
        >
          {isLogin ? "Create an account" : "Log in"}
        </Link>
      </p>
    </div>
  );
}
