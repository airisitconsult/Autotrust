import type { ReactNode } from "react";

const styles: Record<string, string> = {
  green: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  blue: "bg-brand-50 text-brand-700 ring-brand-600/20",
  amber: "bg-amber-50 text-amber-700 ring-amber-600/20",
  red: "bg-red-50 text-red-700 ring-red-600/20",
  slate: "bg-slate-100 text-slate-700 ring-slate-500/20",
};

export function Badge({
  children,
  color = "slate",
}: {
  children: ReactNode;
  color?: keyof typeof styles;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${styles[color]}`}
    >
      {children}
    </span>
  );
}

export function VettedBadge() {
  return (
    <Badge color="green">
      <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
        <path
          fillRule="evenodd"
          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
          clipRule="evenodd"
        />
      </svg>
      AutoTrust Vetted
    </Badge>
  );
}

const conditionColor: Record<string, keyof typeof styles> = {
  excellent: "green",
  good: "blue",
  fair: "amber",
  poor: "red",
};

export function ConditionBadge({ condition }: { condition: string }) {
  return (
    <Badge color={conditionColor[condition] ?? "slate"}>
      {condition[0].toUpperCase() + condition.slice(1)}
    </Badge>
  );
}
