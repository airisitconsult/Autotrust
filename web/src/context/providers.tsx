"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { AdvisorChatProvider } from "./advisor-chat";
import { AuthProvider } from "./auth";

export function Providers({ children }: { children: ReactNode }) {
  // Created once per browser session (not per render).
  const [queryClient] = useState(
    () => new QueryClient({ defaultOptions: { queries: { retry: 1, staleTime: 15_000 } } }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AdvisorChatProvider>{children}</AdvisorChatProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
