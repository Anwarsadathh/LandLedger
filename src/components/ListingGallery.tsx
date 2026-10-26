"use client";

import { useEffect, useState } from "react";

type Media = { type: string; url: string };

export function ListingGallery({
  media,
  title,
  titleLang,
  subtypeLabel,
  transactionLabel,
  priceLabel,
  locationLabel,
}: {
  media: Media[];
  title: string;
  titleLang?: string;
  subtypeLabel: string;
  transactionLabel: string;
  priceLabel: string;
  locationLabel: string;
}) {
  const [active, setActive] = useState(0);
  const [saved, setSaved] = useState(false);
  const [lightbox, setLightbox] = useState(false);

  const hasMedia = media.length > 0;
  const current = media[active];
  const isVideo = (m?: Media) => m?.type === "VIDEO";

  // thumbnails: show up to 5, collapse the rest behind a "+N" tile
  const MAX_THUMBS = 5;
  const visibleThumbs = media.slice(0, MAX_THUMBS);
  const overflow = media.length - MAX_THUMBS;

  useEffect(() => {
    if (!lightbox) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLightbox(false);
      if (e.key === "ArrowRight") setActive((i) => (i + 1) % media.length);
      if (e.key === "ArrowLeft") setActive((i) => (i - 1 + media.length) % media.length);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightbox, media.length]);

  return (
    <div className="flex flex-col gap-3">
      {/* ---------- hero ---------- */}
      <div className="relative overflow-hidden rounded-3xl bg-[var(--accent-soft)]">
        <div className="aspect-[4/3] w-full sm:aspect-[16/10]">
          {hasMedia ? (
            isVideo(current) ? (
              <video src={current.url} controls className="h-full w-full object-cover" />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={current.url}
                alt={title}
                className="h-full w-full cursor-zoom-in object-cover"
                onClick={() => setLightbox(true)}
              />
            )
          ) : (
            <div className="flex h-full w-full items-center justify-center text-sm text-[var(--muted)]">
              No photos provided
            </div>
          )}
        </div>

        {/* gradient + overlay text */}
        {hasMedia && (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent p-5 pt-16 text-white">
            <div className="flex flex-wrap gap-2">
              <span className="rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-[var(--foreground)]">{subtypeLabel}</span>
              <span className="rounded-full bg-[var(--accent)] px-3 py-1 text-xs font-semibold text-white">{transactionLabel}</span>
            </div>
            <h1 lang={titleLang} className="mt-3 text-2xl font-extrabold tracking-tight drop-shadow sm:text-3xl">{title}</h1>
            <p className="mt-1 flex items-center gap-1.5 text-sm text-white/85">
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 21s-7-5.6-7-11a7 7 0 1 1 14 0c0 5.4-7 11-7 11Z" />
                <circle cx="12" cy="10" r="2.5" />
              </svg>
              {locationLabel}
            </p>
            <p className="mt-2 text-2xl font-extrabold">{priceLabel}</p>
          </div>
        )}

        {/* save heart */}
        <button
          type="button"
          aria-pressed={saved}
          aria-label={saved ? "Saved" : "Save"}
          onClick={() => setSaved((s) => !s)}
          className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-[var(--foreground)] shadow-md backdrop-blur transition hover:scale-105"
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill={saved ? "var(--accent)" : "none"} stroke={saved ? "var(--accent)" : "currentColor"} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 21s-7-4.8-9.4-8.6C1 9.6 2.2 6 5.6 6c2 0 3.3 1.2 4.4 2.6C11.1 7.2 12.4 6 14.4 6c3.4 0 4.6 3.6 3 6.4C19 16.2 12 21 12 21Z" />
          </svg>
        </button>
      </div>

      {/* ---------- thumbnails ---------- */}
      {media.length > 1 && (
        <div className="grid grid-cols-5 gap-2">
          {visibleThumbs.map((m, i) => {
            const isLast = i === MAX_THUMBS - 1 && overflow > 0;
            return (
              <button
                key={i}
                type="button"
                onClick={() => {
                  setActive(i);
                  if (isLast) setLightbox(true);
                }}
                className={`relative aspect-square overflow-hidden rounded-xl border-2 transition ${
                  active === i ? "border-[var(--accent)]" : "border-transparent hover:border-[var(--border)]"
                }`}
              >
                {isVideo(m) ? (
                  <span className="flex h-full w-full items-center justify-center bg-[var(--foreground)] text-white">
                    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
                  </span>
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={m.url} alt="" className="h-full w-full object-cover" />
                )}
                {isLast && (
                  <span className="absolute inset-0 flex items-center justify-center bg-black/55 text-sm font-semibold text-white">
                    +{overflow + 1}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* ---------- lightbox ---------- */}
      {lightbox && hasMedia && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4" onClick={() => setLightbox(false)}>
          <button aria-label="Close" className="absolute right-5 top-5 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20">
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
          </button>
          <button
            aria-label="Previous"
            onClick={(e) => { e.stopPropagation(); setActive((i) => (i - 1 + media.length) % media.length); }}
            className="absolute left-4 flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
          >
            <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M15 6l-6 6 6 6" /></svg>
          </button>
          <div className="max-h-[85vh] max-w-5xl" onClick={(e) => e.stopPropagation()}>
            {isVideo(current) ? (
              <video src={current.url} controls className="max-h-[85vh] rounded-xl" />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={current.url} alt={title} className="max-h-[85vh] rounded-xl object-contain" />
            )}
            <p className="mt-3 text-center text-sm text-white/70">{active + 1} / {media.length}</p>
          </div>
          <button
            aria-label="Next"
            onClick={(e) => { e.stopPropagation(); setActive((i) => (i + 1) % media.length); }}
            className="absolute right-4 flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
          >
            <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M9 6l6 6-6 6" /></svg>
          </button>
        </div>
      )}
    </div>
  );
}
