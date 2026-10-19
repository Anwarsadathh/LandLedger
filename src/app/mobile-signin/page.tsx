import { Suspense } from "react";
import type { Metadata } from "next";
import { MobileOtpForm } from "@/components/MobileOtpForm";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Sign in with mobile — OROVA" };

export default function MobileSignInPage() {
  return (
    <Suspense>
      <MobileOtpForm />
    </Suspense>
  );
}
