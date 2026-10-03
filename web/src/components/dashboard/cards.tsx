import type { ReactNode } from "react";
import { AreaChart, type ChartPoint } from "@/components/charts/area-chart";
import { Icon, type IconName } from "@/components/ui/icon";
import { cn } from "@/lib/cn";

/** The dark rounded surface every dashboard panel sits on. */
export function Panel({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "rounded-3xl border border-night-line bg-night-800 p-5 shadow-[0_1px_0_0_rgb(255_255_255/0.03)_inset] sm:p-6",
        className,
      )}
    >
      {children}
    </section>
  );
}

export function PanelTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-4 flex items-center justify-between gap-3">
      <h2 className="text-base font-bold text-night-text">{children}</h2>
      {action}
    </div>
  );
}

/** A big card with a headline number and a glowing trend line underneath. */
export function ChartCard({
  title,
  value,
  caption,
  badge,
  data,
  footer,
  color,
  formatValue,
}: {
  title: string;
  value: string;
  caption: string;
  badge?: string;
  /** The trend line; leave out to show `footer` instead. */
  data?: ChartPoint[];
  footer?: ReactNode;
  color?: string;
  formatValue?: (v: number) => string;
}) {
  return (
    <Panel>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-night-muted">{title}</h2>
            {badge && (
              <span className="rounded-full bg-trust-500/20 px-2 py-0.5 text-[11px] font-bold text-trust-300">
                {badge}
              </span>
            )}
          </div>
          <p className="mt-2 text-3xl font-extrabold tracking-tight text-night-text sm:text-4xl">{value}</p>
          <p className="mt-1 text-xs text-night-muted">{caption}</p>
        </div>
      </div>
      {data ? (
        <AreaChart data={data} color={color} formatValue={formatValue} className="mt-4" />
      ) : (
        <div className="mt-5">{footer}</div>
      )}
    </Panel>
  );
}

/** A small number tile with an icon. */
export function MiniStat({
  label,
  value,
  icon,
  tone = "accent",
  hint,
}: {
  label: string;
  value: string | number;
  icon: IconName;
  tone?: "accent" | "green" | "amber" | "red";
  hint?: string;
}) {
  const tones = {
    accent: "bg-accent/15 text-accent",
    green: "bg-trust-500/15 text-trust-300",
    amber: "bg-gold-500/15 text-gold-400",
    red: "bg-red-500/15 text-red-300",
  };
  return (
    <div className="flex items-center gap-3.5 rounded-2xl border border-night-line bg-night-800 p-4">
      <span className={cn("flex h-11 w-11 items-center justify-center rounded-xl", tones[tone])}>
        <Icon name={icon} />
      </span>
      <div className="min-w-0">
        <p className="truncate text-xs font-medium text-night-muted">{label}</p>
        <p className="text-xl font-extrabold leading-tight text-night-text">{value}</p>
        {hint && <p className="truncate text-[11px] text-night-muted">{hint}</p>}
      </div>
    </div>
  );
}

/** Horizontal bars, e.g. listings by state. */
export function BarList({ items }: { items: { label: string; value: number }[] }) {
  const max = Math.max(...items.map((i) => i.value), 1);
  if (items.length === 0) {
    return <p className="py-6 text-center text-sm text-night-muted">Nothing to show yet.</p>;
  }
  return (
    <ul className="space-y-3.5">
      {items.map((item) => (
        <li key={item.label}>
          <div className="mb-1.5 flex items-center justify-between text-sm">
            <span className="font-medium text-night-text">{item.label}</span>
            <span className="text-night-muted">{item.value}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-night-600">
            <div
              className="h-full rounded-full bg-gradient-to-r from-brand-500 to-accent"
              style={{ width: `${Math.max(6, (item.value / max) * 100)}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
