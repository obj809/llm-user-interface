type ThinkingDotProps = {
  size?: number;
  className?: string;
};

// A flashing dot used as the "thinking" indicator while a reply is pending.
// Theme-aware: dark dot in light mode, white dot in dark mode.
export default function ThinkingDot({
  size = 17,
  className = "",
}: ThinkingDotProps) {
  return (
    <span
      role="status"
      aria-label="Thinking"
      style={{ width: size, height: size }}
      className={`inline-block animate-pulse rounded-full bg-neutral-800 dark:bg-neutral-100 ${className}`}
    />
  );
}
