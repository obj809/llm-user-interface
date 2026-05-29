"use client";

import { useState } from "react";
import Markdown from "./Markdown";

export type Message = {
  id: number;
  role: "user" | "assistant";
  content: string;
};

async function copyToClipboard(text: string) {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return;
    }
  } catch {
    // Fall through to the legacy fallback below.
  }

  // Fallback for non-secure contexts where the Clipboard API is unavailable.
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand("copy");
  document.body.removeChild(textarea);
}

export default function ChatMessage({ message }: { message: Message }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await copyToClipboard(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (message.role === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[80%] whitespace-pre-wrap rounded-2xl bg-zinc-100 px-4 py-2.5 text-zinc-900 dark:bg-[#1f1f1f] dark:text-zinc-100">
          {message.content}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <Markdown content={message.content} />
      <div className="flex items-center gap-1 text-zinc-400 dark:text-zinc-500">
        <ActionButton label={copied ? "Copied" : "Copy"} onClick={handleCopy}>
          {copied ? <CheckIcon /> : <CopyIcon />}
        </ActionButton>
      </div>
    </div>
  );
}

function ActionButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick?: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg transition-colors hover:bg-zinc-200 hover:text-zinc-700 dark:hover:bg-zinc-700/50 dark:hover:text-zinc-200"
    >
      {children}
    </button>
  );
}

const iconProps = {
  width: 17,
  height: 17,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

function CopyIcon() {
  return (
    <svg {...iconProps}>
      <rect x="9" y="9" width="13" height="13" rx="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg {...iconProps} className="text-green-600">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

