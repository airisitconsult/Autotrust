"use client";

import { useEffect } from "react";
import { Logo } from "@/components/brand/logo";
import { Button, ButtonLink } from "@/components/ui/button";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-ink-50 px-6 text-center">
      <Logo className="h-12" />
      <h1 className="mt-10 text-3xl font-extrabold tracking-tight text-ink-950 sm:text-4xl">
        Something went wrong
      </h1>
      <p className="mt-3 max-w-md text-ink-500">
        We couldn&apos;t load this page. If the problem continues, the AutoTrust server may be
        unreachable. Try again in a moment.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Button onClick={reset}>Try again</Button>
        <ButtonLink href="/" variant="secondary">
          Go home
        </ButtonLink>
      </div>
    </div>
  );
}
