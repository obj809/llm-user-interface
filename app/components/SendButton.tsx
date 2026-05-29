type SendButtonProps = {
  onClick?: () => void;
};

export default function SendButton({ onClick }: SendButtonProps) {
  return (
    <button
      type="button"
      aria-label="Send message"
      onClick={onClick}
      className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-xl bg-green-600 text-white transition-colors hover:bg-green-700"
    >
      <ArrowUpIcon />
    </button>
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
