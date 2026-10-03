"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Panel, PanelTitle } from "@/components/dashboard/cards";
import { BankInstructions, CopyButton, OrderStatusBadge, Timeline } from "@/components/dashboard/order-parts";
import { Button } from "@/components/ui/button";
import { ErrorNote, Field, Input, Textarea } from "@/components/ui/fields";
import { PageSpinner } from "@/components/ui/spinner";
import { extractErrorMessage, getOrder, orderAction, type OrderAction } from "@/lib/api";
import { assetUrl } from "@/lib/assets";
import { formatDate } from "@/lib/format";
import type { Order } from "@/lib/types";

const money = (o: Order, n: number) =>
  `${o.currency} ${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function Line({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex justify-between gap-4 py-2 text-sm">
      <dt className="text-night-muted">{label}</dt>
      <dd className={strong ? "font-extrabold text-night-text" : "font-semibold text-night-text"}>{value}</dd>
    </div>
  );
}

/** Everything the viewer can do next, driven by the `actions` the server sent. */
function Actions({ order, onDone }: { order: Order; onDone: (o: Order) => void }) {
  const [error, setError] = useState<string | null>(null);
  const [payer, setPayer] = useState("");
  const [bankRef, setBankRef] = useState("");
  const [note, setNote] = useState("");
  const [reason, setReason] = useState("");
  const [payoutRef, setPayoutRef] = useState("");
  const [asking, setAsking] = useState<"cancel" | "reject" | null>(null);

  const run = useMutation({
    mutationFn: (action: OrderAction) => orderAction(order.id, action),
    onSuccess: (o) => {
      setError(null);
      setAsking(null);
      setReason("");
      onDone(o);
    },
    onError: (err) => setError(extractErrorMessage(err)),
  });
  const has = (a: string) => order.actions.includes(a);
  const busy = run.isPending;

  function submitPayment(e: FormEvent) {
    e.preventDefault();
    run.mutate({
      type: "submit_payment",
      payer_name: payer.trim(),
      bank_reference: bankRef.trim() || undefined,
      note: note.trim() || undefined,
    });
  }

  return (
    <div className="space-y-4">
      {error && <ErrorNote>{error}</ErrorNote>}

      {order.payment?.rejected_reason && order.status === "pending_payment" && order.my_role === "buyer" && (
        <p className="rounded-2xl bg-red-500/10 p-4 text-sm text-red-300">
          <strong>We couldn&apos;t confirm your payment:</strong> {order.payment.rejected_reason}. Please check and
          submit the details again.
        </p>
      )}

      {/* ---- buyer ---- */}
      {has("submit_payment") && (
        <>
          <BankInstructions order={order} />
          <form onSubmit={submitPayment} className="space-y-3 rounded-2xl border border-night-line bg-night-900 p-4">
            <p className="text-sm font-bold text-night-text">
              {order.status === "payment_submitted" ? "Update your payment details" : "Made the transfer? Tell us"}
            </p>
            <Field label="Name on the sending account" htmlFor="payer">
              <Input id="payer" required minLength={2} value={payer} onChange={(e) => setPayer(e.target.value)} />
            </Field>
            <Field label="Bank transfer reference (optional)" htmlFor="bref">
              <Input id="bref" value={bankRef} onChange={(e) => setBankRef(e.target.value)} />
            </Field>
            <Field label="Note (optional)" htmlFor="pnote">
              <Textarea id="pnote" rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
            </Field>
            <Button type="submit" className="w-full" disabled={busy}>
              {busy ? "Sending…" : order.status === "payment_submitted" ? "Update details" : "I've made the payment"}
            </Button>
            {order.status === "payment_submitted" && (
              <p className="text-xs text-night-muted">We&apos;re checking for your transfer and will confirm it soon.</p>
            )}
          </form>
        </>
      )}
      {has("confirm_receipt") && (
        <div className="rounded-2xl border border-trust-500/40 bg-trust-500/10 p-4">
          <p className="font-bold text-trust-300">Payment confirmed — collect your car</p>
          <p className="mt-1 text-sm text-night-muted">
            Meet the seller, check the car matches its listing, then confirm. Confirming releases the seller&apos;s
            payment, so only do it once the car is yours.
          </p>
          <Button
            variant="success"
            className="mt-3 w-full"
            disabled={busy}
            onClick={() => {
              if (confirm("Confirm you have received the car? This releases the seller's payment.")) {
                run.mutate({ type: "confirm_receipt" });
              }
            }}
          >
            {busy ? "Confirming…" : "I've received the car"}
          </Button>
        </div>
      )}

      {/* ---- seller ---- */}
      {has("add_bank_details") && (
        <p className="rounded-2xl bg-gold-500/15 p-4 text-sm text-gold-400">
          <strong>Add your bank details</strong> so we can pay you once the buyer confirms.{" "}
          <Link href="/dashboard/settings" className="font-semibold underline">
            Add them now
          </Link>
        </p>
      )}

      {/* ---- payment staff ---- */}
      {order.my_role === "staff" && order.payment && (
        <div className="rounded-2xl border border-night-line bg-night-900 p-4 text-sm">
          <p className="font-bold text-night-text">What the buyer reported</p>
          <dl className="mt-2 divide-y divide-night-line">
            <Line label="Name on account" value={order.payment.payer_name ?? "—"} />
            <Line label="Bank reference" value={order.payment.bank_reference ?? "—"} />
            {order.payment.note && <Line label="Note" value={order.payment.note} />}
            <Line label="Expected narration" value={order.reference} />
            <Line label="Expected amount" value={money(order, order.price)} strong />
          </dl>
        </div>
      )}
      {has("confirm_payment") && (
        <Button variant="success" className="w-full" disabled={busy} onClick={() => run.mutate({ type: "confirm_payment" })}>
          {busy ? "Confirming…" : "Confirm the money arrived"}
        </Button>
      )}
      {has("mark_delivered") && (
        <Button
          variant="secondary"
          className="w-full"
          disabled={busy}
          onClick={() => {
            if (confirm("Mark this car as handed over? Do this only if the buyer can't confirm it themselves.")) {
              run.mutate({ type: "mark_delivered" });
            }
          }}
        >
          Mark as handed over
        </Button>
      )}
      {has("record_payout") && (
        <div className="rounded-2xl border border-night-line bg-night-900 p-4">
          <p className="font-bold text-night-text">Pay the seller {money(order, order.seller_payout)}</p>
          {order.seller_bank ? (
            <dl className="mt-2 divide-y divide-night-line text-sm">
              <div className="flex items-center justify-between gap-2 py-2">
                <dt className="text-night-muted">Bank</dt>
                <dd className="font-semibold text-night-text">{order.seller_bank.bank_name}</dd>
              </div>
              <div className="flex items-center justify-between gap-2 py-2">
                <dt className="text-night-muted">Account number</dt>
                <dd className="flex items-center gap-1 font-semibold text-night-text">
                  {order.seller_bank.account_number}
                  <CopyButton value={order.seller_bank.account_number} label="account number" />
                </dd>
              </div>
              <Line label="Account name" value={order.seller_bank.account_name} />
            </dl>
          ) : (
            <p className="mt-2 text-sm text-gold-400">The seller hasn&apos;t saved bank details yet.</p>
          )}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              run.mutate({ type: "record_payout", payout_reference: payoutRef.trim() });
            }}
            className="mt-3 space-y-3"
          >
            <Field label="Bank transfer reference" htmlFor="pref" hint="From the transfer you made to the seller.">
              <Input id="pref" required minLength={3} value={payoutRef} onChange={(e) => setPayoutRef(e.target.value)} />
            </Field>
            <Button type="submit" className="w-full" disabled={busy || !order.seller_bank}>
              {busy ? "Saving…" : "Record payout"}
            </Button>
          </form>
        </div>
      )}

      {/* ---- reasons for rejecting / cancelling ---- */}
      {asking && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            run.mutate(asking === "reject" ? { type: "reject_payment", reason: reason.trim() } : { type: "cancel", reason: reason.trim() || undefined });
          }}
          className="space-y-3 rounded-2xl border border-night-line bg-night-900 p-4"
        >
          <Field
            label={asking === "reject" ? "Why couldn't you confirm it?" : "Reason for cancelling"}
            htmlFor="reason"
            hint={asking === "reject" ? "The buyer will see this." : order.status === "paid" ? "Required — the buyer is owed a refund." : "Optional."}
          >
            <Textarea
              id="reason"
              rows={3}
              required={asking === "reject" || order.status === "paid"}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </Field>
          <div className="flex gap-2">
            <Button type="submit" variant={asking === "cancel" ? "danger" : "primary"} disabled={busy}>
              {asking === "reject" ? "Reject payment" : "Cancel order"}
            </Button>
            <Button type="button" variant="ghost" onClick={() => setAsking(null)}>
              Back
            </Button>
          </div>
        </form>
      )}
      {!asking && (has("reject_payment") || has("cancel")) && (
        <div className="flex flex-wrap gap-2">
          {has("reject_payment") && (
            <Button variant="secondary" size="sm" onClick={() => setAsking("reject")}>
              Reject payment
            </Button>
          )}
          {has("cancel") && (
            <Button variant="danger" size="sm" onClick={() => setAsking("cancel")}>
              Cancel order
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

export default function OrderPage() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const { data: order, isLoading, isError } = useQuery({
    queryKey: ["order", id],
    queryFn: () => getOrder(id),
    refetchInterval: 20_000,
  });

  if (isLoading) return <PageSpinner />;
  if (isError || !order) {
    return (
      <div className="mx-auto max-w-lg text-center">
        <p className="text-night-text">That order wasn&apos;t found.</p>
        <Link href="/dashboard/orders" className="mt-3 inline-block text-sm font-semibold text-accent">
          ← Back to orders
        </Link>
      </div>
    );
  }

  function update(o: Order) {
    queryClient.setQueryData(["order", id], o);
    queryClient.invalidateQueries({ queryKey: ["orders"] });
    queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
  }

  const v = order.vehicle;
  const showFee = order.my_role !== "buyer";
  const waiting = order.status === "pending_payment" && order.my_role === "buyer";
  const hoursLeft = Math.max(0, Math.round((new Date(order.expires_at + "Z").getTime() - Date.now()) / 3_600_000));

  return (
    <div className="mx-auto max-w-5xl">
      <Link href="/dashboard/orders" className="mb-3 inline-block text-sm font-semibold text-night-muted hover:text-night-text">
        ← All orders
      </Link>

      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-night-muted">Order {order.reference}</p>
          <h1 className="mt-1 text-2xl font-extrabold text-night-text sm:text-3xl">{v.title}</h1>
          <p className="mt-1 text-sm text-night-muted">
            {order.my_role === "buyer" ? "You're buying this car" : order.my_role === "seller" ? "You're selling this car" : "Staff view"}
          </p>
        </div>
        <OrderStatusBadge status={order.status} />
      </div>

      {waiting && (
        <p className="mb-5 rounded-2xl bg-gold-500/15 p-4 text-sm text-gold-400">
          The car is reserved for you for about <strong>{hoursLeft} hours</strong>. If we don&apos;t see a payment by
          then, the reservation ends and the car goes back on sale.
        </p>
      )}

      <div className="grid gap-5 lg:grid-cols-[1fr_24rem]">
        <div className="space-y-5">
          <Panel>
            <div className="flex items-center gap-4">
              <span className="relative flex h-20 w-28 flex-shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-brand-700 to-night-900 text-xs font-bold text-white/70">
                {v.thumb_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={assetUrl(v.thumb_url)} alt="" className="absolute inset-0 h-full w-full object-cover" />
                ) : (
                  "No photo"
                )}
              </span>
              <div className="min-w-0">
                <p className="truncate font-bold text-night-text">{v.title}</p>
                <p className="text-sm text-night-muted">{v.location}</p>
                {v.status !== "draft" && (
                  <Link href={`/cars/${v.id}`} className="text-sm font-semibold text-accent hover:underline">
                    View the listing
                  </Link>
                )}
              </div>
            </div>
            <dl className="mt-4 divide-y divide-night-line border-t border-night-line">
              <Line label="Price" value={money(order, order.price)} strong={!showFee} />
              {showFee && order.platform_fee > 0 && (
                <Line label={`AutoTrust fee (${Math.round((order.platform_fee / order.price) * 100)}%)`} value={`− ${money(order, order.platform_fee)}`} />
              )}
              {showFee && <Line label={order.my_role === "seller" ? "You receive" : "Seller receives"} value={money(order, order.seller_payout)} strong />}
              <Line label="Buyer" value={order.buyer} />
              <Line label="Seller" value={order.seller} />
              <Line label="Placed" value={formatDate(order.created_at)} />
            </dl>
          </Panel>

          <Panel>
            <PanelTitle>Progress</PanelTitle>
            <Timeline order={order} />
          </Panel>
        </div>

        <div>
          <Panel className="lg:sticky lg:top-24">
            <PanelTitle>
              {order.actions.some((a) => a !== "cancel") ? "What happens next" : "Status"}
            </PanelTitle>
            {order.actions.length === 0 ? (
              <p className="text-sm text-night-muted">
                {order.status === "completed"
                  ? "All done. Thank you for using AutoTrust."
                  : order.status === "cancelled"
                    ? "Nothing more to do on this order."
                    : order.my_role === "seller" && order.status === "pending_payment"
                      ? "The buyer is arranging payment. You'll be told when it's confirmed."
                      : order.my_role === "seller" && order.status === "payment_submitted"
                        ? "AutoTrust is checking the buyer's payment."
                        : order.my_role === "seller" && order.status === "paid"
                          ? "Payment is confirmed. Hand the car over to the buyer. You're paid once they confirm."
                          : order.my_role === "seller" && order.status === "delivered"
                            ? "Handover confirmed. AutoTrust will pay you shortly."
                            : "We'll let you know the moment something changes."}
              </p>
            ) : (
              <Actions order={order} onDone={update} />
            )}
          </Panel>
        </div>
      </div>
    </div>
  );
}
