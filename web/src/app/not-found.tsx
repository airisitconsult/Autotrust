import { Logo } from "@/components/brand/logo";
import { ButtonLink } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-ink-50 px-6 text-center">
      <Logo className="h-12" />
      <p className="mt-10 text-sm font-bold uppercase tracking-widest text-brand-600">404</p>
      <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-ink-950 sm:text-4xl">
        We can&apos;t find that page
      </h1>
      <p className="mt-3 max-w-md text-ink-500">
        The link may be old, or the car may have been removed by its seller.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <ButtonLink href="/cars">Browse cars</ButtonLink>
        <ButtonLink href="/" variant="secondary">
          Go home
        </ButtonLink>
      </div>
    </div>
  );
}
