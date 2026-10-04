import Link from "next/link";
import { cn } from "@/lib/cn";

/** The AutoTrust logo. `onDark` keeps the full-colour logo but sits it on a white plate, since its navy lettering would disappear on a dark background. */
export function Logo({
  className,
  onDark = false,
  href = "/",
}: {
  className?: string;
  onDark?: boolean;
  href?: string;
}) {
  return (
    <Link
      href={href}
      aria-label="AutoTrust home"
      className={cn("inline-flex items-center", onDark && "rounded-xl bg-white px-3 py-1.5 shadow-sm")}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/logo.webp"
        alt="AutoTrust"
        className={cn("h-10 w-auto", className)}
      />
    </Link>
  );
}
