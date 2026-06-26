type SendButtonProps = {
  onClick?: () => void;
  // While a reply streams, the button becomes a stop control: a square glyph
  // in neutral zinc (green reads as "go"), aborting the response on click.
  streaming?: boolean;
};

export default function SendButton({ onClick, streaming = false }: SendButtonProps) {
  return (
    <button
      type="button"
      aria-label={streaming ? "Stop response" : "Send message"}
      onClick={onClick}
      className={`flex h-9 w-9 cursor-pointer items-center justify-center rounded-xl text-white transition-colors ${
        streaming
          ? "bg-zinc-700 hover:bg-zinc-800 dark:bg-zinc-600 dark:hover:bg-zinc-500"
          : "bg-green-600 hover:bg-green-700"
      }`}
    >
      {streaming ? <StopIcon /> : <ArrowUpIcon />}
    </button>
  );
}

function StopIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <rect x="6" y="6" width="12" height="12" rx="2" />
    </svg>
  );
}

function ArrowUpIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 19V5M5 12l7-7 7 7" />
    </svg>
  );
}
