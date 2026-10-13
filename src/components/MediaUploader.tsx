"use client";

import { useRef, useState } from "react";

export type MediaItem = { url: string; type: "PHOTO" | "VIDEO"; publicId?: string };

// Per-file size caps (Cloudinary free tier: ~10MB image, ~100MB video).
const MAX_IMAGE = 10 * 1024 * 1024;
const MAX_VIDEO = 100 * 1024 * 1024;

export function MediaUploader({
  value,
  onChange,
}: {
  value: MediaItem[];
  onChange: (items: MediaItem[]) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function uploadOne(file: File): Promise<MediaItem> {
    const isVideo = file.type.startsWith("video/");
    if (isVideo && file.size > MAX_VIDEO) throw new Error(`${file.name} is over 100MB`);
    if (!isVideo && file.size > MAX_IMAGE) throw new Error(`${file.name} is over 10MB`);

    // 1. Get a signature from our server.
    const signRes = await fetch("/api/v1/media/sign", { method: "POST" });
    const signJson = await signRes.json();
    if (!signRes.ok) throw new Error(signJson.error?.message ?? "Could not start upload");
    const { cloudName, apiKey, timestamp, folder, signature } = signJson.data;

    // 2. Upload the file straight to Cloudinary.
    const fd = new FormData();
    fd.append("file", file);
    fd.append("api_key", apiKey);
    fd.append("timestamp", String(timestamp));
    fd.append("folder", folder);
    fd.append("signature", signature);

    const upRes = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`, {
      method: "POST",
      body: fd,
    });
    const upJson = await upRes.json();
    if (!upRes.ok) throw new Error(upJson.error?.message ?? "Upload failed");

    return {
      url: upJson.secure_url as string,
      type: upJson.resource_type === "video" ? "VIDEO" : "PHOTO",
      publicId: upJson.public_id as string,
    };
  }

  async function onFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setBusy(true);
    setError(null);
    const added: MediaItem[] = [];
    try {
      for (const file of Array.from(files)) {
        added.push(await uploadOne(file));
      }
      onChange([...value, ...added]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
      if (added.length) onChange([...value, ...added]); // keep whatever succeeded
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function remove(i: number) {
    onChange(value.filter((_, idx) => idx !== i));
  }

  return (
    <div className="flex flex-col gap-3">
      {value.length > 0 && (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {value.map((m, i) => (
            <div key={m.url} className="group relative overflow-hidden rounded-lg border border-[var(--border)]">
              {m.type === "VIDEO" ? (
                <video src={m.url} className="aspect-square w-full object-cover" muted />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={m.url} alt={`upload ${i + 1}`} className="aspect-square w-full object-cover" />
              )}
              <button
                type="button"
                onClick={() => remove(i)}
                className="absolute right-1 top-1 rounded bg-black/60 px-1.5 py-0.5 text-[10px] text-white opacity-0 transition group-hover:opacity-100"
              >
                Remove
              </button>
              {m.type === "VIDEO" && (
                <span className="absolute bottom-1 left-1 rounded bg-black/60 px-1 py-0.5 text-[10px] text-white">
                  video
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      <div>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          className="btn-ghost"
        >
          {busy ? "Uploading…" : value.length ? "+ Add more" : "Upload photos / video"}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/*,video/*"
          multiple
          className="hidden"
          onChange={(e) => onFiles(e.target.files)}
        />
      </div>

      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}
