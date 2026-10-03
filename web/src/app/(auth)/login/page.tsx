import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthForm } from "@/components/forms/auth-form";

export const metadata: Metadata = { title: "Log in" };

export default function LoginPage() {
  // useSearchParams (inside AuthForm) needs a Suspense boundary.
  return (
    <Suspense>
      <AuthForm mode="login" />
    </Suspense>
  );
}
