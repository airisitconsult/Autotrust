"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { Panel } from "@/components/dashboard/cards";
import { Button } from "@/components/ui/button";
import { ErrorNote, Textarea } from "@/components/ui/fields";
import { PageSpinner } from "@/components/ui/spinner";
import { extractErrorMessage, getEnquiry, sendEnquiryMessage } from "@/lib/api";
import { assetUrl } from "@/lib/assets";
import { cn } from "@/lib/cn";
import { formatPrice } from "@/lib/format";

export default function ConversationPage() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["enquiry", id],
    queryFn: () => getEnquiry(id),
    refetchInterval: 15_000,
  });

  const send = useMutation({
    mutationFn: () => sendEnquiryMessage(id, text.trim()),
    onSuccess: (updated) => {
      setText("");
      setError(null);
      queryClient.setQueryData(["enquiry", id], updated);
      queryClient.invalidateQueries({ queryKey: ["enquiries"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
    },
    onError: (err) => setError(extractErrorMessage(err)),
  });

  // Opening the thread marks it read; refresh the unread badges.
  useEffect(() => {
    if (data) queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
  }, [data?.id, queryClient]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [data?.messages.length]);

  if (isLoading) return <PageSpinner />;
  if (isError || !data) {
    return (
      <div className="mx-auto max-w-lg text-center">
        <p className="text-night-text">That conversation wasn&apos;t found.</p>
        <Link href="/dashboard/enquiries" className="mt-3 inline-block text-sm font-semibold text-accent">
          ← Back to enquiries
        </Link>
      </div>
    );
  }

  const canOpenCar = data.vehicle.status !== "draft";

  function submit(e: FormEvent) {
    e.preventDefault();
    if (text.trim()) send.mutate();
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col">
      <Link href="/dashboard/enquiries" className="mb-3 text-sm font-semibold text-night-muted hover:text-night-text">
        ← All enquiries
      </Link>

      <Panel className="!p-4">
        <div className="flex items-center gap-4">
          <span className="relative flex h-16 w-24 flex-shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-brand-700 to-night-900 text-xs font-bold text-white/70">
            {data.vehicle.thumb_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={assetUrl(data.vehicle.thumb_url)} alt="" className="absolute inset-0 h-full w-full object-cover" />
            ) : (
              "No photo"
            )}
          </span>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-lg font-extrabold text-night-text">{data.vehicle.title}</h1>
            <p className="truncate text-sm text-night-muted">
              {formatPrice(data.vehicle.price)} · {data.vehicle.location}
            </p>
            <p className="text-xs text-night-muted">
              {data.my_role === "seller" ? `Buyer: ${data.counterparty}` : "You're talking to the seller"}
            </p>
          </div>
          {canOpenCar && (
            <Link
              href={`/cars/${data.vehicle.id}`}
              className="hidden flex-shrink-0 rounded-xl border border-night-line px-3.5 py-2 text-sm font-semibold text-night-text transition hover:bg-night-700 sm:block"
            >
              View car
            </Link>
          )}
        </div>
      </Panel>

      <div className="mt-4 space-y-3 px-1" aria-live="polite">
        {data.messages.map((m) => (
          <div key={m.id} className={cn("flex", m.mine ? "justify-end" : "justify-start")}>
            <div
              className={cn(
                "max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed sm:max-w-[75%]",
                m.mine ? "rounded-br-md bg-accent text-white" : "rounded-bl-md bg-night-700 text-night-text",
              )}
            >
              <p className="whitespace-pre-line">{m.body}</p>
              <time className={cn("mt-1 block text-[11px]", m.mine ? "text-white/70" : "text-night-muted")}>
                {new Date(m.created_at).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
              </time>
            </div>
          </div>
        ))}
        <div ref={endRef} />
      </div>

      <form onSubmit={submit} className="sticky bottom-0 mt-4 border-t border-night-line bg-night-950/95 pb-2 pt-4 backdrop-blur">
        {error && (
          <div className="mb-3">
            <ErrorNote>{error}</ErrorNote>
          </div>
        )}
        <div className="flex items-end gap-2">
          <Textarea
            rows={2}
            maxLength={1000}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                if (text.trim()) send.mutate();
              }
            }}
            placeholder="Write a reply…"
            aria-label="Reply"
            className="min-h-12 flex-1 resize-none"
          />
          <Button type="submit" disabled={send.isPending || !text.trim()} className="h-12">
            {send.isPending ? "Sending…" : "Send"}
          </Button>
        </div>
      </form>
    </div>
  );
}
