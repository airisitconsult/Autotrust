"use client";

import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { useAdvisorChat } from "@/context/advisor-chat";

/** A button (usable from server-rendered pages) that opens the chatbot. */
export function OpenChatButton({
  children,
  variant = "primary",
  size = "lg",
  className,
}: {
  children: ReactNode;
  variant?: "primary" | "secondary" | "ghost";
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const { setOpen } = useAdvisorChat();
  return (
    <Button variant={variant} size={size} className={className} onClick={() => setOpen(true)}>
      {children}
    </Button>
  );
}
