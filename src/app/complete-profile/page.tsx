import { Suspense } from "react";
import type { Metadata } from "next";
import { CompletePhoneForm } from "@/components/CompletePhoneForm";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Add your mobile number — OROVA" };

export default function CompleteProfilePage() {
  return (
    <Suspense>
      <CompletePhoneForm />
    </Suspense>
  );
}
