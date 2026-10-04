import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "AutoTrustAI car assistant",
  description: "Chat with the AutoTrust assistant to work out which used car suits your budget and needs.",
};

export default function AdvisorLayout({ children }: { children: React.ReactNode }) {
  return children;
}
