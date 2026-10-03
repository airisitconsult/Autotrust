const usd = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

export function formatPrice(price: number): string {
  return usd.format(price);
}

/** 1,250,000 -> "$1.3M", 48,500 -> "$48.5K" — for tight spaces like stat cards. */
export function formatCompactPrice(price: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(price);
}

export function formatMileage(km: number): string {
  return `${new Intl.NumberFormat("en-US").format(km)} km`;
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function titleCase(text: string): string {
  return text
    .replaceAll("_", " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
