import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import type { VehicleCondition, VehicleStatus } from "@/lib/types";

export function Badge({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold",
        className,
      )}
    >
      {children}
    </span>
  );
}

function CheckIcon() {
  return (
    <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
      <path
        fillRule="evenodd"
        d="M16.7 4.15a.75.75 0 01.14 1.05l-8 10.5a.75.75 0 01-1.13.08l-4.5-4.5a.75.75 0 111.06-1.06l3.9 3.89 7.47-9.82a.75.75 0 011.06-.14z"
        clipRule="evenodd"
      />
    </svg>
  );
}

/** The one place green is used for branding: a vehicle that passed inspection. */
export function VettedBadge({ className }: { className?: string }) {
  return (
    <Badge className={cn("bg-trust-500 text-white shadow-sm", className)}>
      <CheckIcon /> AutoTrust Vetted
    </Badge>
  );
}

const conditionStyles: Record<VehicleCondition, string> = {
  excellent: "bg-trust-50 text-trust-700 night:bg-trust-500/15 night:text-trust-300",
  good: "bg-brand-50 text-brand-700 night:bg-brand-500/15 night:text-brand-300",
  fair: "bg-gold-100 text-gold-700 night:bg-gold-500/15 night:text-gold-400",
  poor: "bg-red-50 text-red-700 night:bg-red-500/15 night:text-red-300",
};

export function ConditionBadge({ condition }: { condition: VehicleCondition }) {
  return <Badge className={cn("capitalize", conditionStyles[condition])}>{condition}</Badge>;
}

const statusStyles: Record<VehicleStatus, string> = {
  listed: "bg-brand-50 text-brand-700 night:bg-brand-500/15 night:text-brand-300",
  reserved: "bg-gold-100 text-gold-700 night:bg-gold-500/15 night:text-gold-400",
  sold: "bg-ink-100 text-ink-600 night:bg-night-600 night:text-night-muted",
  draft: "bg-gold-100 text-gold-700 night:bg-gold-500/15 night:text-gold-400",
};

export function StatusBadge({ status }: { status: VehicleStatus }) {
  return <Badge className={cn("capitalize", statusStyles[status])}>{status}</Badge>;
}
