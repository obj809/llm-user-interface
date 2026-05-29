"use client";

import { useEffect, useRef, useState } from "react";

const MODELS = ["Gemini 2.5 Flash-Lite"] as const;
type Model = (typeof MODELS)[number];

type ModelSelectorProps = {
  value?: Model;
  onChange?: (model: Model) => void;
  dropUp?: boolean;
};

export default function ModelSelector({
  value,
  onChange,
  dropUp = false,
}: ModelSelectorProps) {
  const [open, setOpen] = useState(false);
  const [internal, setInternal] = useState<Model>("Gemini 2.5 Flash-Lite");
  const containerRef = useRef<HTMLDivElement>(null);

  // Support both controlled and uncontrolled usage.
  const selected = value ?? internal;

  useEffect(() => {
    if (!open) return;

    const handleClick = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  const select = (model: Model) => {
    setInternal(model);
    onChange?.(model);
    setOpen(false);
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="flex cursor-pointer items-center gap-1.5 text-sm transition-colors hover:text-black dark:hover:text-zinc-100"
      >
        <span className="text-zinc-800 dark:text-zinc-200">{selected}</span>
        <ChevronDownIcon open={open} />
      </button>

      {open && (
        <ul
          role="listbox"
          className={`absolute right-0 min-w-44 rounded-xl border border-zinc-200 bg-white p-1 shadow-xl dark:border-zinc-700 dark:bg-[#262626] ${
            dropUp ? "bottom-full mb-2" : "top-full mt-2"
          }`}
        >
          {MODELS.map((model) => (
            <li key={model}>
              <button
                type="button"
                role="option"
                aria-selected={model === selected}
                onClick={() => select(model)}
                className="flex w-full cursor-pointer items-center justify-between gap-3 whitespace-nowrap rounded-lg px-3 py-2 text-left text-sm text-zinc-700 transition-colors hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-700/50"
              >
                {model}
                {model === selected && <CheckIcon />}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ChevronDownIcon({ open }: { open: boolean }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`text-zinc-500 transition-transform ${open ? "rotate-180" : ""}`}
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="text-green-600"
    >
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}
