import { Suspense } from "react";
import { AuthForm } from "@/components/AuthForm";

export const dynamic = "force-dynamic";

export default function SignInPage() {
  return (
    <Suspense>
      <AuthForm mode="signin" />
    </Suspense>
  );
}
