"use client";

import { useRef, useState } from "react";

/**
 * Searchable select with a free-text fallback: type to filter the options, and
 * if what you want isn't listed, pick "Use …" to enter it anyway.
 */
export function Combobox({
  value,
  onChange,
  options,
  placeholder,
  allowCustom = true,
  disabled = false,
  maxShown = 50,
}: {
  value: string;
  onChange: (v: string) => void;
  options: string[];
  placeholder?: string;
  allowCustom?: boolean;
  disabled?: boolean;
  maxShown?: number;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const blurTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const q = query.trim().toLowerCase();
  const filtered = (q ? options.filter((o) => o.toLowerCase().includes(q)) : options).slice(0, maxShown);
  const exact = options.some((o) => o.toLowerCase() === q);
  const showCustom = allowCustom && q.length > 0 && !exact;

  function commit(v: string) {
    onChange(v);
    setQuery("");
    setOpen(false);
  }

  return (
    <div className="relative">
      <input
        className="input w-full"
        placeholder={placeholder}
        disabled={disabled}
        value={open ? query : value}
        onChange={(e) => {
          setQuery(e.target.value);
          if (!open) setOpen(true);
        }}
        onFocus={() => {
          if (disabled) return;
          setQuery("");
          setOpen(true);
        }}
        onBlur={() => {
          // Delay so an option click registers before the list closes.
          blurTimer.current = setTimeout(() => {
            setOpen(false);
            setQuery("");
          }, 120);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            if (filtered[0]) commit(filtered[0]);
            else if (showCustom) commit(query.trim());
          } else if (e.key === "Escape") {
            setOpen(false);
            setQuery("");
            (e.target as HTMLInputElement).blur();
          }
        }}
      />

      {open && (filtered.length > 0 || showCustom) && (
        <ul
          onMouseDown={() => {
            if (blurTimer.current) clearTimeout(blurTimer.current);
          }}
          className="absolute z-30 mt-1 max-h-60 w-full overflow-auto rounded-md border border-[var(--border)] bg-[var(--card)] text-sm shadow-md"
        >
          {filtered.map((o) => (
            <li key={o}>
              <button
                type="button"
                onClick={() => commit(o)}
                className="block w-full px-3 py-2 text-left hover:bg-[var(--accent-soft)]"
              >
                {o}
              </button>
            </li>
          ))}
          {showCustom && (
            <li>
              <button
                type="button"
                onClick={() => commit(query.trim())}
                className="block w-full px-3 py-2 text-left font-medium text-[var(--accent)] hover:bg-[var(--accent-soft)]"
              >
                Use “{query.trim()}”
              </button>
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
