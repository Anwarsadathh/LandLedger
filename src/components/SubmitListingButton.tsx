"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function SubmitListingButton({ id }: { id: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit() {
    setBusy(true);
    setErr(null);
    const res = await fetch(`/api/v1/listings/${id}/submit`, { method: "POST" });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setErr(j.error?.message ?? "Failed");
      setBusy(false);
      return;
    }
    router.refresh();
  }

  return (
    <span className="inline-flex items-center gap-2">
      <button onClick={submit} disabled={busy} className="btn-ghost">
        {busy ? "…" : "Submit for review"}
      </button>
      {err && <span className="text-xs text-red-500">{err}</span>}
    </span>
  );
}
