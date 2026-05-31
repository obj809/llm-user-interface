"use client";

type HomeButtonProps = {
  onClick: () => void;
};

// Discrete reset button: returns the app to the welcome screen.
export default function HomeButton({ onClick }: HomeButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Return home and start a new conversation"
      className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full text-zinc-600 transition-colors hover:bg-zinc-200 dark:text-zinc-300 dark:hover:bg-zinc-800"
    >
      <HomeIcon />
    </button>
  );
}

function HomeIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 9.5 12 3l9 6.5" />
      <path d="M5 10v10h14V10" />
      <path d="M9 20v-6h6v6" />
    </svg>
  );
}
