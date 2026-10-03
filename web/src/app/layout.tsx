import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { Providers } from "@/context/providers";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-jakarta",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "AutoTrust — Verified used cars in Nigeria",
    template: "%s · AutoTrust",
  },
  description:
    "Buy and sell used cars with confidence. Every AutoTrust Vetted listing has been physically inspected, with an AI-written report you can read before you buy.",
  icons: { icon: "/favicon.webp" },
};

export const viewport: Viewport = {
  themeColor: "#101e4a",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={jakarta.variable}>
      <body className="min-h-screen font-sans">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
