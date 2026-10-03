"use client";

import { useEffect, type ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * A panel that slides in over the page: from the bottom (mobile filters) or
 * the left (mobile navigation). Closes on Escape or a tap on the backdrop,
 * and stops the page behind it scrolling while open.
 */
export function Sheet({
  open,
  onClose,
  title,
  side = "bottom",
  children,
  className,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  side?: "bottom" | "left";
  children: ReactNode;
  className?: string;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-ink-950/60 backdrop-blur-[2px]" onClick={onClose} aria-hidden />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn(
          "absolute flex flex-col bg-white shadow-2xl night:bg-night-800",
          side === "bottom" && "inset-x-0 bottom-0 max-h-[88vh] rounded-t-3xl",
          side === "left" && "inset-y-0 left-0 w-72 max-w-[85vw]",
          className,
        )}
      >
        {children}
      </div>
    </div>
  );
}
