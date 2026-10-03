import Link from "next/link";
import { cn } from "@/lib/cn";

/** The AutoTrust logo. `onDark` turns it white for dark backgrounds. */
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
    <Link href={href} aria-label="AutoTrust home" className="inline-flex items-center">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/logo.webp"
        alt="AutoTrust"
        className={cn("h-10 w-auto", onDark && "brightness-0 invert", className)}
      />
    </Link>
  );
}
