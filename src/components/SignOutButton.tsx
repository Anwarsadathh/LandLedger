"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function SignOutButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function signOut() {
    setBusy(true);
    await fetch("/api/v1/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  }

  return (
    <button
      onClick={signOut}
      disabled={busy}
      className="text-[var(--muted)] hover:text-[var(--foreground)]"
    >
      {busy ? "…" : "Sign out"}
    </button>
  );
}
