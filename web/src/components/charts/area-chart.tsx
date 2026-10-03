import { useId } from "react";
import { cn } from "@/lib/cn";

export interface ChartPoint {
  label: string;
  value: number;
}

const W = 300;
const H = 120;
const PAD_TOP = 14;
const PAD_BOTTOM = 8;

/** Smooth curve through the points (a Catmull-Rom-style spline as cubic Béziers). */
function smoothPath(points: [number, number][]): string {
  if (points.length < 2) return "";
  let d = `M ${points[0][0]} ${points[0][1]}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] ?? points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] ?? p2;
    const t = 0.18;
    const c1x = p1[0] + (p2[0] - p0[0]) * t;
    const c1y = p1[1] + (p2[1] - p0[1]) * t;
    const c2x = p2[0] - (p3[0] - p1[0]) * t;
    const c2y = p2[1] - (p3[1] - p1[1]) * t;
    d += ` C ${c1x.toFixed(1)} ${c1y.toFixed(1)}, ${c2x.toFixed(1)} ${c2y.toFixed(1)}, ${p2[0]} ${p2[1]}`;
  }
  return d;
}

/**
 * A glowing area chart in the style of the dashboard reference: a smooth line
 * with a soft gradient beneath it and a bright dot on the latest value. Pure
 * SVG, no chart library. Month labels sit underneath.
 */
export function AreaChart({
  data,
  color = "#4d7bff",
  className,
  formatValue = (v) => String(v),
}: {
  data: ChartPoint[];
  color?: string;
  className?: string;
  formatValue?: (value: number) => string;
}) {
  const uid = useId().replace(/:/g, "");
  const max = Math.max(...data.map((d) => d.value), 0);
  const empty = max === 0;
  const step = data.length > 1 ? W / (data.length - 1) : W;

  const points: [number, number][] = data.map((d, i) => {
    const ratio = empty ? 0 : d.value / max;
    const y = H - PAD_BOTTOM - ratio * (H - PAD_TOP - PAD_BOTTOM);
    return [Math.round(i * step * 10) / 10, Math.round(y * 10) / 10];
  });
  const line = smoothPath(points);
  const area = line ? `${line} L ${W} ${H} L 0 ${H} Z` : "";
  const last = points[points.length - 1];

  return (
    <div className={cn("w-full", className)}>
      <div className="relative">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          preserveAspectRatio="none"
          className="h-28 w-full overflow-visible"
          role="img"
          aria-label={data.map((d) => `${d.label}: ${formatValue(d.value)}`).join(", ")}
        >
          <defs>
            <linearGradient id={`fill-${uid}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor={color} stopOpacity="0.35" />
              <stop offset="1" stopColor={color} stopOpacity="0" />
            </linearGradient>
            <filter id={`glow-${uid}`} x="-20%" y="-50%" width="140%" height="200%">
              <feGaussianBlur stdDeviation="3.5" />
            </filter>
          </defs>

          {/* faint guide lines */}
          {[0.25, 0.5, 0.75].map((g) => (
            <line
              key={g}
              x1="0"
              x2={W}
              y1={H * g}
              y2={H * g}
              stroke="currentColor"
              strokeOpacity="0.06"
              strokeDasharray="2 6"
              vectorEffect="non-scaling-stroke"
            />
          ))}

          {area && <path d={area} fill={`url(#fill-${uid})`} opacity={empty ? 0.3 : 1} />}
          {line && (
            <>
              <path
                d={line}
                fill="none"
                stroke={color}
                strokeWidth="5"
                strokeLinecap="round"
                opacity="0.55"
                filter={`url(#glow-${uid})`}
                vectorEffect="non-scaling-stroke"
              />
              <path
                d={line}
                fill="none"
                stroke={color}
                strokeWidth="2.25"
                strokeLinecap="round"
                strokeLinejoin="round"
                vectorEffect="non-scaling-stroke"
                opacity={empty ? 0.45 : 1}
              />
            </>
          )}
        </svg>

        {/* The latest-value dot is an HTML element so it stays round while the SVG stretches. */}
        {last && !empty && (
          <span
            className="absolute h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full ring-4"
            style={{
              left: `${(last[0] / W) * 100}%`,
              top: `${(last[1] / H) * 100}%`,
              backgroundColor: "#fff",
              boxShadow: `0 0 14px ${color}`,
              // ring colour = the line colour at low opacity
              ["--tw-ring-color" as string]: `${color}66`,
            }}
          />
        )}
        {empty && (
          <span className="absolute inset-x-0 top-1/2 -translate-y-1/2 text-center text-xs text-night-muted">
            No activity yet
          </span>
        )}
      </div>

      <div className="mt-2 flex justify-between text-[11px] font-medium text-night-muted">
        {data.map((d) => (
          <span key={d.label + d.value} className="w-0 flex-1 text-center first:text-left last:text-right">
            {d.label}
          </span>
        ))}
      </div>
    </div>
  );
}
