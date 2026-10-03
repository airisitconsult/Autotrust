"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/cn";
import { formatDate } from "@/lib/format";
import type { Order, OrderStatus } from "@/lib/types";

export const STATUS_LABEL: Record<OrderStatus, string> = {
  pending_payment: "Waiting for payment",
  payment_submitted: "Payment submitted",
  paid: "Paid — handover",
  delivered: "Delivered — payout due",
  completed: "Completed",
  cancelled: "Cancelled",
};

const STATUS_STYLE: Record<OrderStatus, string> = {
  pending_payment: "bg-gold-500/15 text-gold-400",
  payment_submitted: "bg-accent/15 text-accent",
  paid: "bg-brand-500/15 text-brand-300",
  delivered: "bg-gold-500/15 text-gold-400",
  completed: "bg-trust-500/15 text-trust-300",
  cancelled: "bg-night-600 text-night-muted",
};

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  return <Badge className={STATUS_STYLE[status]}>{STATUS_LABEL[status]}</Badge>;
}

/** Anything the viewer can do besides cancelling counts as "needs action". */
export function needsAction(order: Order): boolean {
  return order.actions.some((a) => a !== "cancel");
}

export function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      // clipboard blocked: the value is still shown on screen to copy by hand
    }
  }
  return (
    <button
      type="button"
      onClick={copy}
      aria-label={`Copy ${label}`}
      className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg text-night-muted transition hover:bg-night-600 hover:text-night-text"
    >
      <Icon name={copied ? "check" : "copy"} className={cn("h-4 w-4", copied && "text-trust-300")} />
    </button>
  );
}

function Row({ label, value, copy }: { label: string; value: string; copy?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2.5">
      <div className="min-w-0">
        <p className="text-xs text-night-muted">{label}</p>
        <p className="truncate font-bold text-night-text">{value}</p>
      </div>
      {copy && <CopyButton value={value} label={label} />}
    </div>
  );
}

/** Where the buyer sends the money, and what to write on the transfer. */
export function BankInstructions({ order }: { order: Order }) {
  if (!order.pay_to) return null;
  const p = order.pay_to;
  return (
    <div className="rounded-2xl border border-accent/40 bg-accent/10 p-4 sm:p-5">
      <p className="text-sm font-bold text-night-text">Pay by bank transfer</p>
      <p className="mt-0.5 text-xs text-night-muted">
        Send exactly this amount and put the reference in the transfer narration so we can match it.
      </p>
      <div className="mt-3 divide-y divide-night-line">
        <Row label="Amount" value={`${p.currency} ${p.amount.toLocaleString("en-US", { minimumFractionDigits: 2 })}`} />
        <Row label="Bank" value={p.bank_name} />
        <Row label="Account number" value={p.account_number} copy />
        <Row label="Account name" value={p.account_name} copy />
        <Row label="Reference (narration)" value={p.reference} copy />
      </div>
    </div>
  );
}

interface Step {
  label: string;
  at: string | null;
  note?: string;
}

/** The five stages of a sale, ticked off as they happen. */
export function Timeline({ order }: { order: Order }) {
  const steps: Step[] = [
    { label: "Order placed", at: order.created_at },
    { label: "Payment submitted", at: order.payment_submitted_at },
    { label: "Payment confirmed", at: order.paid_at },
    { label: "Car handed over", at: order.delivered_at },
    {
      label: order.seller_payout > 0 && order.platform_fee > 0 ? "Seller paid" : "Completed",
      at: order.completed_at,
      note: order.payout_reference ? `Transfer ref ${order.payout_reference}` : undefined,
    },
  ];
  const firstOpen = steps.findIndex((s) => !s.at);

  if (order.status === "cancelled") {
    return (
      <div className="rounded-2xl bg-night-900 p-4 text-sm">
        <p className="font-bold text-night-text">This order was cancelled</p>
        {order.cancel_reason && <p className="mt-1 text-night-muted">{order.cancel_reason}</p>}
        {order.cancelled_at && <p className="mt-1 text-xs text-night-muted">{formatDate(order.cancelled_at)}</p>}
      </div>
    );
  }

  return (
    <ol className="space-y-0">
      {steps.map((s, i) => {
        const done = !!s.at;
        const current = i === firstOpen;
        return (
          <li key={s.label} className="relative flex gap-4 pb-6 last:pb-0">
            {i < steps.length - 1 && (
              <span
                aria-hidden
                className={cn("absolute left-[13px] top-7 h-full w-0.5", done ? "bg-trust-500/50" : "bg-night-600")}
              />
            )}
            <span
              className={cn(
                "relative z-10 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold",
                done
                  ? "bg-trust-500 text-white"
                  : current
                    ? "bg-accent text-white ring-4 ring-accent/25"
                    : "bg-night-600 text-night-muted",
              )}
            >
              {done ? "✓" : i + 1}
            </span>
            <div>
              <p className={cn("text-sm font-semibold", done || current ? "text-night-text" : "text-night-muted")}>
                {s.label}
              </p>
              <p className="text-xs text-night-muted">
                {s.at ? formatDate(s.at) : current ? "Next" : ""}
                {s.note ? ` · ${s.note}` : ""}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
